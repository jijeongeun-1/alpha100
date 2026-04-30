'use client'

import { useState, useRef, useEffect } from 'react'
import { ProjectType } from '@/app/types'

interface Props {
  value: ProjectType
  onChange: (type: ProjectType) => void
}

const TYPES: { id: ProjectType; label: string; desc: string }[] = [
  { id: 'package', label: '패키지', desc: '예비창업패키지, 초기창업패키지, 재도전패키지 등' },
  { id: 'voucher', label: '바우처', desc: '혁신바우처, 관광바우처, 제조바우처 등' },
]

export default function TypeSelector({ value, onChange }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-sm font-semibold text-gray-700">사업 유형 선택</p>
        <span className="text-xs font-medium text-red-500">필수</span>
        <div className="relative" ref={tooltipRef}>
          <button
            onClick={() => setShowTooltip((v) => !v)}
            className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center text-xs font-bold leading-none"
          >
            ?
          </button>
          {showTooltip && (
            <div className="absolute left-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64 text-xs text-gray-600">
              {TYPES.map(({ id, label, desc }) => (
                <div key={id} className="mb-1.5 last:mb-0">
                  <span className="font-semibold text-gray-800">{label}</span>
                  <span className="text-gray-500"> — {desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`py-3 rounded-lg border-2 text-sm font-semibold transition-all
              ${value === id
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
