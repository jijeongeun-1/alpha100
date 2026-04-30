'use client'

import { useState } from 'react'
import { ScheduleRow } from '@/app/types'

interface Props {
  rows: ScheduleRow[]
  monthLabels: string[]
}

export default function ScheduleTable({ rows, monthLabels }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const headerCells = ['구분', '세부 내용', ...monthLabels].map((h) => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f3f4f6;font-weight:600">${h}</th>`).join('')
    const bodyCells = rows
      .map(
        (r) =>
          `<tr><td style="border:1px solid #ccc;padding:6px 10px">${r.phase}</td><td style="border:1px solid #ccc;padding:6px 10px">${r.detail}</td>${r.months.map((on) => `<td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${on ? '●' : ''}</td>`).join('')}</tr>`
      )
      .join('')
    const html = `<table style="border-collapse:collapse;width:100%"><thead><tr>${headerCells}</tr></thead><tbody>${bodyCells}</tbody></table>`
    const plain = [
      ['구분', '세부 내용', ...monthLabels].join('\t'),
      ...rows.map((r) => [r.phase, r.detail, ...r.months.map((on, i) => (on ? monthLabels[i] : ''))].join('\t')),
    ].join('\n')

    try {
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
    } catch {
      navigator.clipboard.writeText(plain)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">추진일정</h3>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all
            ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'}`}
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[480px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 text-left text-gray-600 font-semibold border border-gray-200 w-1/4">구분</th>
              <th className="py-2 px-3 text-left text-gray-600 font-semibold border border-gray-200 w-1/4">세부 내용</th>
              {monthLabels.map((m) => (
                <th key={m} className="py-2 px-2 text-center text-gray-600 font-semibold border border-gray-200">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-3 text-gray-700 font-medium border border-gray-200">{row.phase}</td>
                <td className="py-2 px-3 text-gray-600 border border-gray-200">{row.detail}</td>
                {row.months.map((on, j) => (
                  <td key={j} className="py-2 px-2 text-center border border-gray-200">
                    {on && <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
