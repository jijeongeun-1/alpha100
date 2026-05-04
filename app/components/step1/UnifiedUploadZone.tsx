'use client'

import { useRef, useState, DragEvent } from 'react'
import { UploadedFile, FileRole } from '@/app/types'
import { classifyByFilename, ROLE_LABELS } from '@/app/lib/classifyFile'

interface Props {
  files: UploadedFile[]
  onAdd: (files: UploadedFile[]) => void
  onRemove: (id: string) => void
  onRoleChange: (id: string, role: FileRole) => void
  onMemoChange: (id: string, memo: string) => void
}

const MAX_SINGLE_MB = 50
const MAX_TOTAL_MB = 200
const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'mp4', 'pptx']

const ROLE_OPTIONS: { value: FileRole; label: string }[] = [
  { value: 'prev-report', label: '사전보고서 서류' },
  { value: 'work', label: '작업 결과물' },
  { value: 'template', label: '사후보고서 템플릿' },
]

const FALLBACK_ROLE_ORDER: FileRole[] = ['work', 'prev-report', 'template']

const ROLE_COLORS: Record<FileRole, string> = {
  'prev-report': 'bg-blue-100 text-blue-700',
  'work': 'bg-purple-100 text-purple-700',
  'template': 'bg-green-100 text-green-700',
  'unassigned': 'bg-yellow-100 text-yellow-700',
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', mp4: '🎬', pptx: '📊',
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export default function UnifiedUploadZone({ files, onAdd, onRemove, onRoleChange, onMemoChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  function processFiles(rawFiles: FileList | null) {
    if (!rawFiles) return
    setError('')
    const newFiles: UploadedFile[] = []
    let err = ''

    const totalBytes = files.reduce((s, f) => s + f.size, 0)
    let addedBytes = 0

    Array.from(rawFiles).forEach((f) => {
      const ext = getExt(f.name)
      if (!ALLOWED_EXTS.includes(ext)) {
        err = `${f.name}: 지원하지 않는 형식입니다.`
        return
      }
      if (f.size > MAX_SINGLE_MB * 1024 * 1024) {
        err = `${f.name}: 파일 크기가 ${MAX_SINGLE_MB}MB를 초과합니다.`
        return
      }
      addedBytes += f.size
      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        type: ext,
        role: classifyByFilename(f.name),
      })
    })

    if (err) { setError(err); return }
    if (totalBytes + addedBytes > MAX_TOTAL_MB * 1024 * 1024) {
      setError(`전체 파일 용량이 ${MAX_TOTAL_MB}MB를 초과했습니다.`)
      return
    }

    // 키워드로 분류되지 않은 파일을 아직 채워지지 않은 역할로 자동 배정
    const coveredRoles = new Set<FileRole>([
      ...files.map((f) => f.role).filter((r) => r !== 'unassigned'),
      ...newFiles.filter((f) => f.role !== 'unassigned').map((f) => f.role),
    ])
    const missingRoles = FALLBACK_ROLE_ORDER.filter((r) => !coveredRoles.has(r))
    let missingIdx = 0
    for (const file of newFiles) {
      if (file.role === 'unassigned') {
        file.role = missingIdx < missingRoles.length ? missingRoles[missingIdx++] : 'work'
      }
    }

    onAdd(newFiles)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const groupedFiles = {
    'prev-report': files.filter((f) => f.role === 'prev-report'),
    'work': files.filter((f) => f.role === 'work'),
    'template': files.filter((f) => f.role === 'template'),
  }

  const ALL_ROLES: FileRole[] = ['prev-report', 'work', 'template']
  const allRolesCovered = ALL_ROLES.every((r) => files.some((f) => f.role === r))
  const showRoleError = files.length >= 3 && !allRolesCovered
  const showRoleSuccess = allRolesCovered

  return (
    <div className="flex flex-col gap-3">
      {/* 안내 문구 */}
      <div className="text-xs text-gray-500 leading-relaxed">
        <p className="mb-1">아래 파일을 모두 업로드 해주세요.</p>
        <ol className="list-decimal list-inside space-y-0.5 text-gray-500">
          <li>정부건 사전 서류 PDF <span className="text-gray-400">(과업지시서, 수행계획서, 위탁개발계획서 등)</span></li>
          <li>정부건 사후 서류 PDF <span className="text-gray-400">(검수조서, 결과보고서 등)</span></li>
          <li>실무부서에서 제작한 사후 결과물 PDF</li>
        </ol>
      </div>

      {/* 드롭존 */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 text-center">
          <span className="text-blue-600 font-medium">파일 선택</span> 또는 여기에 드래그
        </p>
        <p className="text-xs text-gray-400">PDF, JPG, PNG, MP4, PPTX · 파일당 최대 {MAX_SINGLE_MB}MB · 전체 {MAX_TOTAL_MB}MB</p>
        <p className="text-xs text-gray-400">HWP 파일은 PDF로 변환 후 업로드해 주세요.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.mp4,.pptx"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-500 px-1">{error}</p>}

      {/* 파일 추가 버튼 (파일 있을 때) */}
      {files.length > 0 && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium text-left px-1"
        >
          + 파일 추가
        </button>
      )}

      {/* 분류별 파일 목록 */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {(Object.entries(groupedFiles) as [FileRole, UploadedFile[]][])
            .filter(([, list]) => list.length > 0)
            .map(([role, list]) => (
              <div key={role}>
                <p className="text-xs font-semibold text-gray-500 px-1 mb-1">{ROLE_LABELS[role]} ({list.length})</p>
                <ul className="flex flex-col gap-2">
                  {list.map((f) => (
                    <li key={f.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{FILE_ICONS[f.type] ?? '📎'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                          <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
                        </div>
                        {/* 역할 드롭다운 */}
                        <select
                          value={f.role}
                          onChange={(e) => onRoleChange(f.id, e.target.value as FileRole)}
                          className={`text-xs font-medium px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${ROLE_COLORS[f.role]}`}
                        >
                          {ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => onRemove(f.id)}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {f.role === 'work' && (
                        <input
                          type="text"
                          placeholder="이 파일에 대해 추가 설명이 있으면 입력하세요 (선택)"
                          value={f.memo ?? ''}
                          onChange={(e) => onMemoChange(f.id, e.target.value)}
                          className="mt-2 w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {/* 파일 분류 상태 안내 */}
          {showRoleError && (
            <p className="text-xs text-red-500 px-1 pt-1">
              모든 유형의 파일을 업로드 해주세요. (사전보고서 서류 / 작업 결과물 / 사후보고서 템플릿)
            </p>
          )}
          {showRoleSuccess && (
            <p className="text-xs text-green-600 px-1 pt-1">
              파일의 유형이 올바른지 검토 후 초안 작성을 시작해주세요.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
