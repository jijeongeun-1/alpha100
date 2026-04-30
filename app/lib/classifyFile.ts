export type FileRole = 'prev-report' | 'work' | 'template' | 'unassigned'

// 사전보고서 서류: 과업지시서 포함
const PREV_REPORT_KEYWORDS = [
  '사전', '계획서', '협약서', '신청서', '선정', '과제', '제안서', '사업계획',
  '과업지시서', '과업지시',
]

// 사후보고서 템플릿: 결과보고서, 과업결과보고서, 산출물 포함
const TEMPLATE_KEYWORDS = [
  '템플릿', '양식', '서식', '사후', '결과보고', '보고서양식', '보고양식',
  '결과보고서', '과업결과보고서', '과업결과', '산출물보고', '최종보고',
]

export function classifyByFilename(filename: string): FileRole {
  // NFC 정규화: macOS는 파일명을 NFD(자모 분리)로 저장하므로 NFC로 통일 후 비교
  const name = filename.normalize('NFC').toLowerCase().replace(/\s/g, '')

  if (TEMPLATE_KEYWORDS.some((kw) => name.includes(kw.normalize('NFC').toLowerCase()))) return 'template'
  if (PREV_REPORT_KEYWORDS.some((kw) => name.includes(kw.normalize('NFC').toLowerCase()))) return 'prev-report'

  // 이미지·영상·PPT는 작업결과물로 분류
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'mp4', 'pptx'].includes(ext)) return 'work'

  return 'unassigned'
}

export const ROLE_LABELS: Record<FileRole, string> = {
  'prev-report': '사전보고서 서류',
  'work': '작업 결과물',
  'template': '사후보고서 템플릿',
  'unassigned': '미분류',
}
