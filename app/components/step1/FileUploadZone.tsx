'use client'

import { useRef, useState, DragEvent } from 'react'
import { UploadedFile } from '@/app/types'

interface Props {
  id: string
  label: string
  required?: boolean
  accept: string
  acceptLabel: string
  multiple?: boolean
  files: UploadedFile[]
  maxSizeMB?: number
  maxFiles?: number
  hint?: string
  onAdd: (files: UploadedFile[]) => void
  onRemove: (id: string) => void
  onMemoChange?: (id: string, memo: string) => void
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  mp4: '🎬',
  pptx: '📊',
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export default function FileUploadZone({
  id, label, required, accept, acceptLabel, multiple = false,
  files, maxSizeMB = 50, maxFiles = 10, hint,
  onAdd, onRemove, onMemoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  function processFiles(rawFiles: FileList | null) {
    if (!rawFiles) return
    setError('')
    const newFiles: UploadedFile[] = []
    let err = ''

    Array.from(rawFiles).forEach((f) => {
      const ext = getExt(f.name)
      const allowedExts = accept.split(',').map((s) => s.trim().replace('.', '').toLowerCase())
      if (!allowedExts.includes(ext)) {
        err = `${f.name}: 지원하지 않는 형식입니다. (${acceptLabel})`
        return
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        err = `${f.name}: ${maxSizeMB}MB 이하 파일만 업로드 가능합니다.`
        return
      }
      newFiles.push({ id: `${Date.now()}-${Math.random()}`, file: f, name: f.name, size: f.size, type: ext, role: 'unassigned' })
    })

    if (err) { setError(err); return }

    const total = files.length + newFiles.length
    if (total > maxFiles) {
      setError(`최대 ${maxFiles}개까지 업로드 가능합니다.`)
      return
    }
    onAdd(newFiles)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-1">
        {label}
        {required
          ? <span className="ml-2 text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">필수</span>
          : <span className="ml-2 text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">선택</span>
        }
      </h2>
      {hint && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3 leading-relaxed">{hint}</p>
      )}

      {/* 드롭존 */}
      {(multiple || files.length === 0) && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all
            ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">
            <span className="text-blue-600 font-medium">파일 선택</span> 또는 여기에 드래그
          </p>
          <p className="text-xs text-gray-400">{acceptLabel} · 최대 {maxSizeMB}MB</p>
          <input ref={inputRef} id={id} type="file" accept={accept} multiple={multiple} className="hidden"
            onChange={(e) => processFiles(e.target.files)} />
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {/* 업로드된 파일 목록 */}
      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((f) => (
            <li key={f.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{FILE_ICONS[f.type] ?? '📎'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
                  </div>
                </div>
                <button onClick={() => onRemove(f.id)} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {onMemoChange && (
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
      )}

      {/* 파일 추가 버튼 (다중 업로드에서 파일 있을 때) */}
      {multiple && files.length > 0 && files.length < maxFiles && (
        <button onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
          + 파일 추가
        </button>
      )}
    </section>
  )
}
