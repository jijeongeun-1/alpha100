'use client'

import { useState } from 'react'
import { CaptionSuggestion } from '@/app/types'

interface Props {
  item: CaptionSuggestion
}

export default function CaptionCard({ item }: Props) {
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedDesc, setCopiedDesc] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  function copyCaption() {
    navigator.clipboard.writeText(item.caption)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 1500)
  }
  function copyDesc() {
    navigator.clipboard.writeText(item.description)
    setCopiedDesc(true)
    setTimeout(() => setCopiedDesc(false), 1500)
  }
  function copyAll() {
    navigator.clipboard.writeText(`${item.caption}\n${item.description}`)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">이미지 삽입 제안</span>
          <span className="text-xs text-blue-500">{item.source}</span>
        </div>
        <button
          onClick={copyAll}
          className={`text-xs px-2.5 py-1 rounded-md transition-all
            ${copiedAll ? 'bg-green-100 text-green-700' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-100'}`}
        >
          {copiedAll ? '복사됨' : '전체 복사'}
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {/* 캡션 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 mb-1">캡션 제안</p>
            <p className="text-sm text-gray-800 font-medium">{item.caption}</p>
          </div>
          <button
            onClick={copyCaption}
            className={`flex-shrink-0 text-xs px-2 py-1 rounded-md border transition-all mt-4
              ${copiedCaption ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300'}`}
          >
            {copiedCaption ? '복사됨' : '복사'}
          </button>
        </div>
        {/* 설명문구 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 mb-1">설명문구 제안</p>
            <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
          </div>
          <button
            onClick={copyDesc}
            className={`flex-shrink-0 text-xs px-2 py-1 rounded-md border transition-all mt-4
              ${copiedDesc ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300'}`}
          >
            {copiedDesc ? '복사됨' : '복사'}
          </button>
        </div>
      </div>
    </div>
  )
}
