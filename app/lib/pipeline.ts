import OpenAI from 'openai'
import {
  EXTRACT_PRE_REPORT_PROMPT,
  PARSE_TEMPLATE_PROMPT,
  VERIFY_PROMPT,
  buildVerifyUserPrompt,
  PATCH_PROMPT,
  buildPatchUserPrompt,
} from './prompts'
import { FactSheet, TemplateMeta, SectionDraft, TemplateSection } from '@/app/types'

const MODEL = 'gpt-4o'

export interface VerificationReport {
  sectionsMissing: string[]
  imagesMissing: string[]
  hallucinations: Array<{ sectionTitle: string; suspectedFact: string; reason: string }>
}

export interface PatchResult {
  patches: Array<{ title: string; content: string }>
}

type ChatUsage = OpenAI.Chat.Completions.ChatCompletion['usage']
type UserContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart

function logUsage(label: string, usage: ChatUsage | undefined) {
  if (process.env.NODE_ENV !== 'development' || !usage) return
  const cached =
    (usage as { prompt_tokens_details?: { cached_tokens?: number } })
      .prompt_tokens_details?.cached_tokens ?? 0
  console.log(
    `📊 [${label}] in=${usage.prompt_tokens} out=${usage.completion_tokens} cached=${cached}`,
  )
}

function parseJsonObject<T>(raw: string, fallback: T): T {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const last = trimmed.lastIndexOf('}')
    if (last !== -1) {
      try {
        return JSON.parse(trimmed.slice(0, last + 1)) as T
      } catch {
        // fall through
      }
    }
    return fallback
  }
}

function imageParts(images: string[]): UserContentPart[] {
  return images.map((url) => ({
    type: 'image_url',
    image_url: { url, detail: 'high' },
  }))
}

export async function extractPreReport(
  client: OpenAI,
  prevReportImages: string[],
): Promise<FactSheet> {
  const userContent: UserContentPart[] = [
    {
      type: 'text',
      text:
        '아래는 사전보고서 PDF의 페이지별 이미지입니다. 페이지 1부터 마지막 페이지까지 빠짐없이 읽고, ' +
        '시스템 지시에 따라 7개 항목을 JSON으로 추출하십시오. 앞쪽에 계약서·견적서가 있어도 끝까지 읽어 ' +
        '과업지시서 본문(배경·필요성·주요과업내용·수행분야·추진일정·기대효과)까지 모두 분석합니다.',
    },
    ...imageParts(prevReportImages),
  ]

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACT_PRE_REPORT_PROMPT },
      { role: 'user', content: userContent },
    ],
  })

  logUsage('extractPreReport', response.usage)
  const raw = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as FactSheet
}

export async function parseTemplate(
  client: OpenAI,
  templateImages: string[],
): Promise<TemplateMeta[]> {
  const userContent: UserContentPart[] = [
    {
      type: 'text',
      text:
        '아래는 사후보고서 양식 PDF의 페이지별 이미지입니다. 모든 페이지를 끝까지 읽고, ' +
        '시스템 지시에 따라 작성해야 할 모든 섹션을 JSON 배열로 식별하십시오. ' +
        '양식의 빈 영역(작성해야 할 빈 박스·빈 표)도 섹션으로 카운트합니다.',
    },
    ...imageParts(templateImages),
  ]

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PARSE_TEMPLATE_PROMPT },
      { role: 'user', content: userContent },
    ],
  })

  logUsage('parseTemplate', response.usage)
  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = parseJsonObject<{ sections?: TemplateMeta[] }>(raw, { sections: [] })
  return parsed.sections ?? []
}

export function summarizeTemplateMeta(meta: TemplateMeta[]): string {
  const lines: string[] = []
  lines.push('[사전 분석된 사후보고서 양식 섹션 메타데이터]')
  lines.push('이 메타데이터는 사후보고서 양식에서 식별된 모든 작성 섹션 목록입니다.')
  lines.push('templateSections 배열은 반드시 아래 메타데이터의 title을 동일한 순서로 모두 포함해야 합니다.')
  lines.push('- title: 해당 섹션 제목 (그대로 사용)')
  lines.push('- type: 섹션 유형 (A=기업/사업 정보, B=목적·배경, C=수행내용, D=일정, E=수행과정·결과, F=기타)')
  lines.push('- needsImage: true이면 해당 섹션 content에 [이미지 첨부 필요: ...] placeholder를 반드시 포함')
  lines.push('- expectedRows: 표 형식 섹션의 행 항목명 (모두 빠짐없이 표에 포함)')
  lines.push('- notes: 작성 시 참고 사항')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(meta, null, 2))
  lines.push('```')
  return lines.join('\n')
}

export async function verifyDraft(
  client: OpenAI,
  params: {
    draft: SectionDraft
    factSheet: FactSheet
    templateMeta: TemplateMeta[]
    workFilesText: string
  },
): Promise<VerificationReport> {
  const { draft, factSheet, templateMeta, workFilesText } = params
  const userPrompt = buildVerifyUserPrompt({
    draftSectionsJson: JSON.stringify(draft.templateSections ?? [], null, 2),
    factSheetJson: JSON.stringify(factSheet, null, 2),
    templateMetaJson: JSON.stringify(templateMeta, null, 2),
    workFilesText,
  })

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 6000,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: VERIFY_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  logUsage('verifyDraft', response.usage)
  const raw = response.choices[0]?.message?.content ?? '{}'
  return parseJsonObject<VerificationReport>(raw, {
    sectionsMissing: [],
    imagesMissing: [],
    hallucinations: [],
  })
}

export function hasIssues(report: VerificationReport): boolean {
  return (
    report.sectionsMissing.length > 0 ||
    report.imagesMissing.length > 0 ||
    report.hallucinations.length > 0
  )
}

export async function patchDraft(
  client: OpenAI,
  params: {
    draft: SectionDraft
    factSheet: FactSheet
    templateMeta: TemplateMeta[]
    report: VerificationReport
    workFilesText: string
  },
): Promise<PatchResult> {
  const { draft, factSheet, templateMeta, report, workFilesText } = params
  const userPrompt = buildPatchUserPrompt({
    verificationJson: JSON.stringify(report, null, 2),
    draftSectionsJson: JSON.stringify(draft.templateSections ?? [], null, 2),
    factSheetJson: JSON.stringify(factSheet, null, 2),
    templateMetaJson: JSON.stringify(templateMeta, null, 2),
    workFilesText,
  })

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 12000,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PATCH_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  logUsage('patchDraft', response.usage)
  const raw = response.choices[0]?.message?.content ?? '{}'
  return parseJsonObject<PatchResult>(raw, { patches: [] })
}

export function applyPatches(
  draft: SectionDraft,
  patches: PatchResult['patches'],
  templateMeta: TemplateMeta[],
): SectionDraft {
  if (patches.length === 0) return draft

  const sections: TemplateSection[] = [...(draft.templateSections ?? [])]
  const titleToIndex = new Map(sections.map((s, i) => [s.title, i]))
  const metaOrder = templateMeta.map((m) => m.title)

  for (const patch of patches) {
    const idx = titleToIndex.get(patch.title)
    if (idx !== undefined) {
      sections[idx] = { title: patch.title, content: patch.content }
    } else {
      sections.push({ title: patch.title, content: patch.content })
      titleToIndex.set(patch.title, sections.length - 1)
    }
  }

  sections.sort((a, b) => {
    const ai = metaOrder.indexOf(a.title)
    const bi = metaOrder.indexOf(b.title)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return { ...draft, templateSections: sections }
}

export function summarizeFactSheet(fs: FactSheet): string {
  const lines: string[] = []
  lines.push('[추출된 사전보고서 사실 정보 (FactSheet)]')
  lines.push('이 FactSheet는 사전보고서 PDF에서 vision 추출된 모든 사실 정보입니다.')
  lines.push('사후보고서 작성 시 사실 정보(기업명·기간·금액·일정·수행분야 등)는')
  lines.push('이 FactSheet 또는 산출물 파일에 명시된 내용에서만 사용합니다.')
  lines.push('FactSheet의 빈 문자열/빈 배열 항목은 사전보고서에 없었던 항목이므로')
  lines.push('해당 항목은 임의로 채우지 않고 그대로 비워두거나 산출물 파일에서만 보충합니다.')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(fs, null, 2))
  lines.push('```')
  return lines.join('\n')
}
