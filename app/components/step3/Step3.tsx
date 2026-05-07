'use client'

import { useState, useRef } from 'react'
import { SectionDraft, TemplateSection } from '@/app/types'

interface Props {
  draft: SectionDraft
  onRerun: () => void
  onReset: () => void  // kept for compatibility, unused in new layout
}

const TABLE_STYLE = `
  font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  font-size: 13px;
  line-height: 1.7;
  width: 100%;
`

// 복사 HTML 후처리: 모든 table에 margin-bottom 주입 (표 아래 여백)
function processContent(html: string): string {
  return html.replace(
    /(<table\b[^>]*\bstyle=")([^"]*?)(")/gi,
    (match, before, style, after) => {
      if (style.includes('margin-bottom')) return match
      return `${before}${style};margin-bottom:16px${after}`
    },
  )
}

function buildSectionHtml(section: TemplateSection): string {
  return (
    `<div style="margin-bottom:32px">` +
    `<h2 style="font-size:18px;font-weight:bold;margin:0 0 12px 0;padding:6px 0;border-bottom:2px solid #222">${section.title}</h2>` +
    `<div style="${TABLE_STYLE}">${processContent(section.content)}</div>` +
    `</div>`
  )
}

function buildFullHtml(sections: TemplateSection[]): string {
  return (
    `<div style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:13px;line-height:1.7;width:100%">` +
    sections.map(buildSectionHtml).join('') +
    `</div>`
  )
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/\t\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function copyHtml(html: string, plain: string) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
  } catch {
    await navigator.clipboard.writeText(plain)
  }
}

export default function Step3({ draft, onRerun, onReset }: Props) {
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copyError, setCopyError] = useState('')

  const sections = draft.templateSections ?? []
  const hasTemplate = sections.length > 0
  // DOM refs — 편집된 내용을 복사 시점에 읽기 위해 사용
  const contentRefs = useRef<(HTMLDivElement | null)[]>([])

  function getLiveHtml(i: number): string {
    return contentRefs.current[i]?.innerHTML ?? sections[i]?.content ?? ''
  }

  function showCopyError() {
    setCopyError('복사에 실패했습니다. 브라우저 설정을 확인해 주세요.')
    setTimeout(() => setCopyError(''), 3000)
  }

  async function handleCopyAll() {
    const liveHtml = buildFullHtml(
      sections.map((s, i) => ({ ...s, content: getLiveHtml(i) }))
    )
    const plain = sections
      .map((s, i) => `[${s.title}]\n${htmlToPlain(getLiveHtml(i))}`)
      .join('\n\n')
    try {
      await copyHtml(liveHtml, plain)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    } catch {
      showCopyError()
    }
  }

  async function handleCopySection(i: number, section: TemplateSection) {
    const liveContent = processContent(getLiveHtml(i))
    const html = `<div style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:13px;line-height:1.7;width:100%">${liveContent}</div>`
    const plain = htmlToPlain(liveContent)
    try {
      await copyHtml(html, plain)
      setCopiedIdx(i)
      setTimeout(() => setCopiedIdx(null), 1500)
    } catch {
      showCopyError()
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* 완료 배너 */}
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700">
            초안 작성이 완료되었습니다. 섹션별 또는 전체를 복사하여 템플릿에 붙여넣기 하세요.
          </p>
        </div>
        {hasTemplate && (
          <button
            onClick={handleCopyAll}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${copiedAll ? 'bg-green-600 text-white' : 'bg-white border border-green-300 text-green-700 hover:bg-green-100'}`}
          >
            {copiedAll ? '복사됨' : '전체 복사'}
          </button>
        )}
      </div>

      {/* 복사 실패 메시지 */}
      {copyError && (
        <p className="text-xs text-red-500 px-1">{copyError}</p>
      )}

      {/* 문서 미리보기 */}
      {hasTemplate ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {sections.map((section, i) => (
            <div key={i}>
              {/* 섹션 헤더 바 */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">{section.title}</span>
                <button
                  onClick={() => handleCopySection(i, section)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all
                    ${copiedIdx === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                    }`}
                >
                  {copiedIdx === i ? '복사됨' : '복사'}
                </button>
              </div>
              {/* 섹션 콘텐츠 - 클릭하여 직접 편집 가능 */}
              <div
                ref={(el) => { contentRefs.current[i] = el }}
                className="px-5 py-4 doc-content outline-none focus-within:bg-blue-50/30"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm text-gray-500 mb-1">템플릿 초안이 생성되지 않았습니다.</p>
          <p className="text-xs text-gray-400">사후보고서 템플릿 파일을 업로드한 뒤 다시 실행해 주세요.</p>
        </div>
      )}

    </div>
  )
}
