'use client'

import { useEffect, useState, useRef } from 'react'
import { AppState, SectionDraft } from '@/app/types'

interface Props {
  state: AppState
  onComplete: (draft: SectionDraft) => void
  onCancel: () => void
  onError: (msg: string) => void
}

const STAGES = [
  { label: '파일 읽는 중', message: '파일을 읽고 있습니다...' },
  { label: '사업 정보 파악 중', message: '사업 정보를 파악하고 있습니다...' },
  { label: '수행 내용 분석 중', message: '수행 내용을 분석하고 있습니다...' },
  { label: '초안 작성 중', message: '보고서 초안을 작성하고 있습니다...' },
]

export default function Step2({ state, onComplete, onCancel, onError }: Props) {
  const [stageIdx, setStageIdx] = useState(0)
  const [showCancel, setShowCancel] = useState(false)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setStageIdx(1), 1200),
      setTimeout(() => setStageIdx(2), 2400),
      setTimeout(() => setStageIdx(3), 3600),
    ]

    async function run() {
      try {
        const formData = new FormData()
        formData.append('projectType', state.projectType ?? '')
        formData.append('memo', state.memo)

        for (const f of state.files) {
          formData.append(f.role, f.file, f.name)
        }

        const res = await fetch('/api/analyze', { method: 'POST', body: formData })
        const json = await res.json()

        timers.forEach(clearTimeout)

        if (!res.ok || json.error) {
          onError(json.error ?? '분석 중 오류가 발생했습니다.')
          return
        }

        onComplete(json.draft)
      } catch {
        timers.forEach(clearTimeout)
        onError('서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      }
    }

    run()
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-50" />
        <div className="relative w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
          <svg className="w-9 h-9 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-1">{STAGES[stageIdx].message}</h2>
      <p className="text-sm text-gray-500 mb-8">잠시만 기다려 주세요. 업로드한 파일을 분석하고 있습니다.</p>

      <div className="w-full max-w-xs flex flex-col gap-3 text-left mb-10">
        {STAGES.map((stage, i) => {
          const done = i < stageIdx
          const active = i === stageIdx
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                ${done ? 'bg-green-500' : active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                {done ? (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>
              <span className={`text-sm ${done ? 'text-green-600' : active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      <button onClick={() => setShowCancel(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">
        취소
      </button>

      {showCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl">
            <h3 className="text-base font-semibold text-gray-800 mb-2">분석을 취소하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-5">취소하면 이전 입력 화면으로 돌아갑니다. 업로드한 파일과 입력 내용은 유지됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancel(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                계속 분석
              </button>
              <button onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
