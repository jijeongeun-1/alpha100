'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  title: string
  content: string
  onContentChange?: (v: string) => void
}

export default function SectionCard({ title, content, onContentChange }: Props) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all
            ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'}`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              복사됨
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사
            </>
          )}
        </button>
      </div>

      <div className="p-4" onClick={() => !editing && setEditing(true)}>
        {editing ? (
          <>
            <p className="text-xs text-blue-500 mb-2">내용을 직접 수정할 수 있습니다.</p>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onContentChange?.(e.target.value)}
              onBlur={() => setEditing(false)}
              rows={Math.max(4, content.split('\n').length + 1)}
              className="w-full text-sm text-gray-700 leading-relaxed border border-blue-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap cursor-text hover:bg-gray-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors">
            {content}
          </p>
        )}
      </div>
    </div>
  )
}
