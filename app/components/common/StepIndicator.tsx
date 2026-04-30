'use client'

import { Step } from '@/app/types'

interface Props {
  currentStep: Step
}

const STEPS = [
  { step: 1 as Step, label: '입력' },
  { step: 2 as Step, label: '분석 중' },
  { step: 3 as Step, label: '결과' },
]

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map(({ step, label }, idx) => {
        const isDone = currentStep > step
        const isActive = currentStep === step

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                  ${isDone ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'}`}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 mx-1 transition-colors ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
