'use client'

import { AppState, UploadedFile, FileRole } from '@/app/types'
import TypeSelector from './TypeSelector'
import UnifiedUploadZone from './UnifiedUploadZone'
import MemoInput from './MemoInput'

interface Props {
  state: AppState
  setState: (s: Partial<AppState>) => void
  onStart: () => void
}

export default function Step1({ state, setState, onStart }: Props) {
  const hasPrevReport = state.files.some((f) => f.role === 'prev-report')
  const hasWork = state.files.some((f) => f.role === 'work')
  const hasTemplate = state.files.some((f) => f.role === 'template')
  const hasUnassigned = state.files.some((f) => f.role === 'unassigned')

  const hasAnyFile = state.files.some((f) => f.role !== 'unassigned')
  const canStart = !!state.projectType && hasAnyFile && !hasUnassigned

  function addFiles(next: UploadedFile[]) {
    setState({ files: [...state.files, ...next] })
  }
  function removeFile(id: string) {
    setState({ files: state.files.filter((f) => f.id !== id) })
  }
  function changeRole(id: string, role: FileRole) {
    setState({ files: state.files.map((f) => f.id === id ? { ...f, role } : f) })
  }
  function changeMemo(id: string, memo: string) {
    setState({ files: state.files.map((f) => f.id === id ? { ...f, memo } : f) })
  }

  function getMissingHint() {
    if (!state.projectType) return '사업 유형을 선택해 주세요.'
    if (hasUnassigned) return '미분류 파일의 역할을 지정해 주세요.'
    if (!hasAnyFile) return '파일을 1개 이상 업로드해 주세요.'
    return ''
  }

  return (
    <div className="flex flex-col gap-4">
      <TypeSelector value={state.projectType} onChange={(t) => setState({ projectType: t })} />

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          파일 업로드
          <span className="ml-2 text-xs font-medium text-gray-400 font-normal">1개 이상 필수</span>
        </h2>

        {/* 파일 업로드 현황 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { label: '사전보고서', ok: hasPrevReport },
            { label: '작업결과물', ok: hasWork },
            { label: '템플릿', ok: hasTemplate },
          ].map(({ label, ok }) => (
            <span key={label} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors
              ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {ok
                ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }
              {label}
            </span>
          ))}
          <span className="text-xs text-gray-400 self-center">· 3개 모두 있을 때 최적 결과</span>
        </div>

        <UnifiedUploadZone
          files={state.files}
          onAdd={addFiles}
          onRemove={removeFile}
          onRoleChange={changeRole}
          onMemoChange={changeMemo}
        />
      </section>

      <MemoInput value={state.memo} onChange={(memo) => setState({ memo })} />

      <div className="pt-2 pb-6">
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all
            ${canStart
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          분석 시작
        </button>
        {!canStart && (
          <p className="text-center text-xs text-gray-400 mt-2">{getMissingHint()}</p>
        )}
      </div>
    </div>
  )
}
