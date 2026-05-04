import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { parsePdfText } from './parsers/parsePdf'
import { classifyByFilename, FileRole } from './classifyFile'

const cache: Record<string, string> = {}

const LABEL: Record<string, string> = {
  package: '패키지',
  voucher: '바우처',
}

interface PdfEntry {
  filename: string
  filepath: string
  groupKey: string
  role: FileRole
}

// 파일명에서 고객사명(그룹 키) 추출
// - "01. 아이덴티티(하우뷰티), 앱 개발 과업지시서_ABBG.pdf" → "아이덴티티"
// - "[별지 제2-1호] 케이켐비즈 수행계획서[25년]보완.pdf"   → "케이켐비즈"
// - "[2025] 디어먼데이, 그누보드 결과물.pdf"               → "디어먼데이"
// [괄호] prefix는 양식 번호/연도이므로 건너뛰고 그 뒤의 고객사명을 추출
function extractGroupKey(filename: string): string {
  const normalized = filename.normalize('NFC')
  const withoutPrefix = normalized
    .replace(/^\d+\.\s*/, '')           // "01. " 형태 번호 제거
    .replace(/^(\[.*?\]\s*)+/, '')      // "[별지 제2-1호] ", "[2025] " 등 반복 제거
  // 쉼표·공백·괄호 전까지가 고객사명 (예: "케이켐비즈 수행계획서" → "케이켐비즈")
  const match = withoutPrefix.match(/^([^\s,(]+)/)
  return match ? match[1].trim() : withoutPrefix.split(/[\s,(]/)[0].trim()
}

function collectPdfs(typeDir: string): PdfEntry[] {
  if (!existsSync(typeDir)) return []
  const result: PdfEntry[] = []
  for (const entry of readdirSync(typeDir)) {
    const entryPath = join(typeDir, entry)
    if (statSync(entryPath).isDirectory()) {
      for (const file of readdirSync(entryPath)) {
        if (file.toLowerCase().endsWith('.pdf')) {
          result.push({
            filename: file,
            filepath: join(entryPath, file),
            groupKey: extractGroupKey(file),
            role: classifyByFilename(file),
          })
        }
      }
    }
  }
  return result
}

export async function loadExample(projectType: string): Promise<string> {
  if (cache[projectType]) return cache[projectType]

  const typeDir = join(process.cwd(), 'examples', projectType)
  const pdfs = collectPdfs(typeDir)
  if (pdfs.length === 0) return ''

  // 고객사명 기준으로 세트 묶기
  const groups = new Map<string, PdfEntry[]>()
  for (const pdf of pdfs) {
    if (!groups.has(pdf.groupKey)) groups.set(pdf.groupKey, [])
    groups.get(pdf.groupKey)!.push(pdf)
  }

  // 세트 수에 따라 세트당 글자 수 분배 (전체 ~16000자 이내)
  const charPerSet = Math.floor(16000 / Math.max(groups.size, 1))

  const exampleBlocks: string[] = []

  for (const [key, files] of groups) {
    const roleTexts: Partial<Record<FileRole, string>> = {}

    for (const { filepath, role } of files) {
      if (role === 'unassigned') continue
      const buffer = readFileSync(filepath)
      const text = await parsePdfText(buffer)
      roleTexts[role] = (roleTexts[role] ?? '') + text
    }

    const parts: string[] = []
    if (roleTexts['prev-report'])
      parts.push(`【사전보고서】\n${roleTexts['prev-report'].slice(0, Math.floor(charPerSet * 0.4))}`)
    if (roleTexts['work'])
      parts.push(`【산출물 파일】\n${roleTexts['work'].slice(0, Math.floor(charPerSet * 0.25))}`)
    if (roleTexts['template'])
      parts.push(`【완성된 사후보고서】\n${roleTexts['template'].slice(0, Math.floor(charPerSet * 0.35))}`)

    if (parts.length === 0) continue

    const isComplete = !!roleTexts['template']
    const header = isComplete
      ? `▶ 예시 세트 [${key}]\n구조·문체·분량·작성 방식을 참고하세요.`
      : `▶ 예시 세트 [${key}] — 완성된 사후보고서 없음\n아래 파일의 구조·문체·분량·작성 방식만 참고하세요. 사실 정보는 현재 과제 파일에서만 추출합니다.`

    exampleBlocks.push(`${header}\n\n${parts.join('\n\n')}`)
  }

  if (exampleBlocks.length === 0) return ''

  const result = `[참고 예시 — ${LABEL[projectType] ?? projectType}]
아래는 동일 유형의 실제 사례입니다.

${exampleBlocks.join('\n\n' + '─'.repeat(50) + '\n\n')}`

  cache[projectType] = result
  return result
}
