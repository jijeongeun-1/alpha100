import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parsePdfPages } from '@/app/lib/parsers/parsePdfPages'
import { parsePptxText } from '@/app/lib/parsers/parsePptx'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/app/lib/prompts'
import { getRelevantWorkflows } from '@/app/lib/prompts/workflow'
import { loadExample } from '@/app/lib/loadExamples'
import {
  extractPreReport,
  summarizeFactSheet,
  parseTemplate,
  summarizeTemplateMeta,
  verifyDraft,
  hasIssues,
  patchDraft,
  applyPatches,
} from '@/app/lib/pipeline'
import { FactSheet, TemplateMeta, SectionDraft } from '@/app/types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MODEL = 'gpt-4o'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_FILE_SIZES: Record<string, number> = {
  'template':    30 * 1024 * 1024,
  'prev-report': 30 * 1024 * 1024,
  'work':        20 * 1024 * 1024,
}
const WORK_MAX_PAGES = 20

type FileResult =
  | { kind: 'images'; images: string[] }
  | { kind: 'text'; text: string }

async function processFile(buffer: Buffer, filename: string, maxPages?: number): Promise<FileResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  try {
    if (ext === 'pdf') {
      const images = await parsePdfPages(buffer, { maxPages })
      return { kind: 'images', images }
    }
    if (ext === 'pptx') {
      const text = await parsePptxText(buffer)
      return { kind: 'text', text }
    }
    return { kind: 'text', text: '' }
  } catch {
    return ext === 'pdf' ? { kind: 'images', images: [] } : { kind: 'text', text: '' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const projectType = formData.get('projectType') as string
    const memo = (formData.get('memo') as string) ?? ''

    let prevReportImages: string[] = []
    let templateImages: string[] = []
    let workFilesImages: string[] = []
    let workFilesText = ''

    const entries = Array.from(formData.entries())

    // 파일 크기 검증
    for (const [key, value] of entries) {
      if (!(value instanceof File)) continue
      const limit = MAX_FILE_SIZES[key]
      if (limit && value.size > limit) {
        const limitMB = limit / 1024 / 1024
        const label = key === 'work' ? '결과물' : key === 'template' ? '사후보고서 템플릿' : '사전보고서'
        return NextResponse.json(
          { error: `"${value.name}" 파일이 너무 큽니다. ${label} 파일은 최대 ${limitMB}MB까지 업로드 가능합니다.` },
          { status: 400 },
        )
      }
    }

    // 유형별 그룹화 후 template → prev-report → work 순서로 처리
    const groups: Record<string, File[]> = { template: [], 'prev-report': [], work: [] }
    for (const [key, value] of entries) {
      if (value instanceof File && key in groups) groups[key].push(value)
    }

    for (const key of ['template', 'prev-report', 'work'] as const) {
      for (const file of groups[key]) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const maxPages = key === 'work' ? WORK_MAX_PAGES : undefined
        const result = await processFile(buffer, file.name, maxPages)

        if (key === 'prev-report') {
          if (result.kind === 'images') prevReportImages = [...prevReportImages, ...result.images]
        } else if (key === 'work') {
          if (result.kind === 'images') workFilesImages = [...workFilesImages, ...result.images]
          else workFilesText += `\n--- ${file.name} ---\n${result.text}`
        } else if (key === 'template') {
          if (result.kind === 'images') templateImages = [...templateImages, ...result.images]
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '─'.repeat(60))
      console.log(`📜 prevReportImages: ${prevReportImages.length} pages`)
      console.log(`📦 workFilesImages: ${workFilesImages.length} pages, workFilesText: ${workFilesText.length} chars (PPTX)`)
      console.log(`📑 templateImages: ${templateImages.length} pages`)
      console.log('─'.repeat(60) + '\n')
    }

    const [factSheet, templateMeta] = await Promise.all([
      prevReportImages.length > 0
        ? extractPreReport(client, prevReportImages)
        : Promise.resolve<FactSheet | null>(null),
      templateImages.length > 0
        ? parseTemplate(client, templateImages)
        : Promise.resolve<TemplateMeta[] | null>(null),
    ])

    const factSheetSummary = factSheet ? summarizeFactSheet(factSheet) : ''
    const templateMetaSummary = templateMeta ? summarizeTemplateMeta(templateMeta) : ''

    const exampleText = await loadExample(projectType)
    const workflowReference = factSheet
      ? getRelevantWorkflows(factSheet.overview.deliverables)
      : undefined

    const userPrompt = buildUserPrompt({
      projectType,
      workFilesText,
      memo,
      factSheetSummary,
      templateMetaSummary,
      hasWorkFilesImages: workFilesImages.length > 0,
      hasTemplateImages: templateImages.length > 0,
      workflowReference,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '═'.repeat(60))
      console.log('🔎 EXTRACTED FACT SHEET:\n', JSON.stringify(factSheet, null, 2))
      console.log('═'.repeat(60))
      console.log('🧩 TEMPLATE META:\n', JSON.stringify(templateMeta, null, 2))
      console.log('═'.repeat(60))
      console.log('📄 USER PROMPT:\n', userPrompt)
      console.log('═'.repeat(60) + '\n')
    }

    const systemContent = exampleText
      ? `${SYSTEM_PROMPT}\n\n[참고 예시 — 같은 사업 유형의 기존 사후보고서 샘플]\n${exampleText}`
      : SYSTEM_PROMPT

    type ContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart
    const userContent: ContentPart[] = [
      { type: 'text', text: userPrompt },
      ...templateImages.map((url): ContentPart => ({
        type: 'image_url',
        image_url: { url, detail: 'high' },
      })),
      ...workFilesImages.map((url): ContentPart => ({
        type: 'image_url',
        image_url: { url, detail: 'high' },
      })),
    ]

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 16000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
    })

    if (process.env.NODE_ENV === 'development' && response.usage) {
      const u = response.usage
      const cached =
        (u as { prompt_tokens_details?: { cached_tokens?: number } })
          .prompt_tokens_details?.cached_tokens ?? 0
      console.log(
        `📊 [generate] in=${u.prompt_tokens} out=${u.completion_tokens} cached=${cached}`,
      )
    }

    const raw = response.choices[0]?.message?.content ?? '{}'
    let draft: SectionDraft
    try {
      draft = JSON.parse(raw) as SectionDraft
    } catch {
      throw new Error('생성 응답을 JSON으로 파싱할 수 없습니다.')
    }

    if (factSheet && templateMeta && templateMeta.length > 0) {
      const report = await verifyDraft(client, {
        draft,
        factSheet,
        templateMeta,
        workFilesText,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('🛡️ VERIFICATION REPORT:\n', JSON.stringify(report, null, 2))
        console.log('═'.repeat(60))
      }

      if (hasIssues(report)) {
        const patch = await patchDraft(client, {
          draft,
          factSheet,
          templateMeta,
          report,
          workFilesText,
          workflowReference,
        })

        if (process.env.NODE_ENV === 'development') {
          console.log(`🩹 APPLYING ${patch.patches.length} PATCH(ES)`)
          console.log('═'.repeat(60))
        }

        draft = applyPatches(draft, patch.patches, templateMeta)
      }
    }

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('analyze error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
