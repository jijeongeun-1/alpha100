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

export interface TemplateSection {
  title: string
  content: string
}

export interface FactSheetCompany {
  name: string
  representative: string
  bizNumber: string
  address: string
  contactName: string
  contactRole: string
  contactPhone: string
  contactEmail: string
}

export interface FactSheetSchedulePhase {
  phase: string
  detail: string
  startDate: string
  endDate: string
}

export interface FactSheetWorkArea {
  label: string
  detail: string
}

export type SectionType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface TemplateMeta {
  title: string
  type: SectionType
  needsImage: boolean
  expectedRows?: string[]
  notes?: string
}

export interface FactSheet {
  client: FactSheetCompany
  vendor: FactSheetCompany
  overview: {
    projectName: string
    voucherNumber: string
    periodStart: string
    periodEnd: string
    amount: string
    deliverables: string[]
  }
  background: {
    clientStatus: string
    necessity: string
  }
  workAreas: FactSheetWorkArea[]
  schedule: FactSheetSchedulePhase[]
  expectedEffects: string[]
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
  result: string
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
