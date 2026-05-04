'use client'

import { useState, useRef } from 'react'
import { AppState, SectionDraft, UploadedFile, FileRole } from './types'
import TypeSelector from './components/step1/TypeSelector'
import UnifiedUploadZone from './components/step1/UnifiedUploadZone'
import MemoInput from './components/step1/MemoInput'
import Step3 from './components/step3/Step3'

type Status = 'idle' | 'loading' | 'done'

const STAGES = [
  '파일 읽는 중',
  '사업 정보 파악 중',
  '수행 내용 분석 중',
  '초안 작성 중',
]

const INITIAL: AppState = { step: 1, projectType: null, files: [], memo: '', draft: null }

export default function Home() {
  const [state, setState] = useState<AppState>(INITIAL)
  const [status, setStatus] = useState<Status>('idle')
  const [stageIdx, setStageIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  function patch(partial: Partial<AppState>) {
    setState((prev) => ({ ...prev, ...partial }))
  }

  const hasPrevReport = state.files.some((f) => f.role === 'prev-report')
  const hasWork = state.files.some((f) => f.role === 'work')
  const hasTemplate = state.files.some((f) => f.role === 'template')
  const hasAnyFile = state.files.length > 0
  const canRun = !!state.projectType && hasAnyFile && status !== 'loading'

  function getMissingHint() {
    if (!state.projectType) return '사업 유형을 선택해 주세요.'
    if (!hasAnyFile) return '파일을 1개 이상 업로드해 주세요.'
    return ''
  }

  async function handleRun() {
    if (!canRun) return
    setErrorMsg('')
    setStatus('loading')
    setStageIdx(0)

    timersRef.current = [
      setTimeout(() => setStageIdx(1), 1200),
      setTimeout(() => setStageIdx(2), 2400),
      setTimeout(() => setStageIdx(3), 3600),
    ]

    try {
      const formData = new FormData()
      formData.append('projectType', state.projectType ?? '')
      formData.append('memo', state.memo)
      for (const f of state.files) {
        formData.append(f.role, f.file, f.name)
      }

      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const json = await res.json()

      timersRef.current.forEach(clearTimeout)

      if (!res.ok || json.error) {
        setErrorMsg(json.error ?? '분석 중 오류가 발생했습니다.')
        setStatus(state.draft ? 'done' : 'idle')
        return
      }

      patch({ draft: json.draft })
      setStatus('done')
    } catch {
      timersRef.current.forEach(clearTimeout)
      setErrorMsg('서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      setStatus(state.draft ? 'done' : 'idle')
    }
  }

  function handleReset() {
    if (!window.confirm('입력한 내용을 초기화 하시나요?')) return
    timersRef.current.forEach(clearTimeout)
    setState(INITIAL)
    setStatus('idle')
    setErrorMsg('')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── LNB ── */}
      <aside className="w-[576px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* 상단 로고 영역 */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0 bg-gray-800">
          <div>
            <p className="text-xs text-gray-400 font-medium">정부지원사업</p>
            <h1 className="text-sm font-bold text-white leading-tight">사후보고서 초안 자동화</h1>
          </div>
          {(() => {
            const hasAnyInput = !!state.projectType || state.files.length > 0 || state.memo.trim().length > 0 || status === 'done'
            return (
              <button
                onClick={handleReset}
                disabled={!hasAnyInput}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
                  ${hasAnyInput
                    ? 'text-white hover:text-red-300 hover:bg-gray-700 cursor-pointer'
                    : 'text-gray-600 cursor-not-allowed'
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                초기화
              </button>
            )
          })()}
        </div>

        {/* 인풋 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-8">
          <TypeSelector value={state.projectType} onChange={(t) => patch({ projectType: t })} />

          {/* 파일 업로드 */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-gray-700">파일 업로드</p>
              <span className="text-sm font-semibold text-red-500">*</span>
              <div className="flex gap-1">
                {[
                  { label: '사전', ok: hasPrevReport },
                  { label: '결과물', ok: hasWork },
                  { label: '양식', ok: hasTemplate },
                ].map(({ label, ok }) => (
                  <span key={label} className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                    ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <UnifiedUploadZone
              files={state.files}
              onAdd={(next) => patch({ files: [...state.files, ...next] })}
              onRemove={(id) => patch({ files: state.files.filter((f) => f.id !== id) })}
              onRoleChange={(id, role: FileRole) => patch({ files: state.files.map((f) => f.id === id ? { ...f, role } : f) })}
              onMemoChange={(id, memo) => patch({ files: state.files.map((f) => f.id === id ? { ...f, memo } : f) })}
            />
          </section>

          <MemoInput value={state.memo} onChange={(memo) => patch({ memo })} />
        </div>

        {/* 초안 작성 버튼 */}
        <div className="px-7 py-4 border-t border-gray-100 flex-shrink-0">
          {errorMsg && (
            <p className="text-xs text-red-500 mb-2 leading-snug">{errorMsg}</p>
          )}
          <button
            onClick={handleRun}
            disabled={!canRun}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all
              ${canRun
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            {status === 'loading' ? '작성 중...' : status === 'done' ? '다시 작성' : '초안 작성'}
          </button>
          {!canRun && status !== 'loading' && (
            <p className="text-center text-xs text-gray-400 mt-1.5">{getMissingHint()}</p>
          )}
        </div>
      </aside>

      {/* ── 메인 패널 ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Idle */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">초안을 작성할 준비가 되었나요?</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              왼쪽에서 사업 유형을 선택하고 파일을 업로드한 뒤<br />
              <span className="text-blue-500 font-medium">초안 작성</span> 버튼을 누르세요.
            </p>
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
              <div className="relative w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              </div>
            </div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">{STAGES[stageIdx]}</h2>
            <p className="text-sm text-gray-400 mb-8">잠시만 기다려 주세요.</p>
            <div className="flex flex-col gap-2.5 text-left">
              {STAGES.map((label, i) => {
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
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Done */}
        {status === 'done' && state.draft && (
          <div className="px-6 py-6 max-w-4xl mx-auto">
            <Step3
              draft={state.draft}
              onRerun={handleRun}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </div>
  )
}
