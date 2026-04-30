import StepIndicator from './StepIndicator'
import { Step } from '@/app/types'

interface Props {
  currentStep: Step
}

export default function Header({ currentStep }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-800 text-sm">사후보고서 초안 자동화</span>
        </div>
        <StepIndicator currentStep={currentStep} />
      </div>
    </header>
  )
}
