import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parsePdfPages } from '@/app/lib/parsers/parsePdfPages'
import { parsePptxText } from '@/app/lib/parsers/parsePptx'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/app/lib/prompts'
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

type FileResult =
  | { kind: 'images'; images: string[] }
  | { kind: 'text'; text: string }

async function processFile(buffer: Buffer, filename: string): Promise<FileResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  try {
    if (ext === 'pdf') {
      const images = await parsePdfPages(buffer)
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

    for (const [key, value] of entries) {
      if (!(value instanceof File)) continue
      const buffer = Buffer.from(await value.arrayBuffer())
      const result = await processFile(buffer, value.name)

      if (key === 'prev-report') {
        if (result.kind === 'images') prevReportImages = [...prevReportImages, ...result.images]
      } else if (key === 'work') {
        if (result.kind === 'images') workFilesImages = [...workFilesImages, ...result.images]
        else workFilesText += `\n--- ${value.name} ---\n${result.text}`
      } else if (key === 'template') {
        if (result.kind === 'images') templateImages = [...templateImages, ...result.images]
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
    const userPrompt = buildUserPrompt({
      projectType,
      workFilesText,
      memo,
      factSheetSummary,
      templateMetaSummary,
      hasWorkFilesImages: workFilesImages.length > 0,
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
