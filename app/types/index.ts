export type ProjectType = 'package' | 'voucher' | null

export type FileRole = 'prev-report' | 'work' | 'template' | 'unassigned'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  role: FileRole
  memo?: string
}

export interface CompanyInfo {
  name: string
  representative: string
  bizNumber: string
  address: string
  contact: string
}

export interface ScheduleRow {
  phase: string
  detail: string
  months: boolean[]
}

export interface CaptionSuggestion {
  id: string
  source: string
  caption: string
  description: string
}

export interface TemplateSection {
  title: string
  content: string
}

export interface SectionDraft {
  businessField: string
  projectTitle: string
  contractPeriod: string
  contractAmount: string
  clientInfo: CompanyInfo
  vendorInfo: CompanyInfo
  purpose: string
  plan: string
  planSteps: { step: string; content: string; period: string }[]
  schedule: ScheduleRow[]
  content: string[]
  method: string
  process: string
  processCaption: CaptionSuggestion[]
  result: string
  resultCaption: CaptionSuggestion[]
  templateSections?: TemplateSection[]
}

export type Step = 1 | 2 | 3

export interface AppState {
  step: Step
  projectType: ProjectType
  files: UploadedFile[]
  memo: string
  draft: SectionDraft | null
}
