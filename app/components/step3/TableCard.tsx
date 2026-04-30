'use client'

import { useState } from 'react'

interface Props {
  title: string
  rows: { label: string; value: string }[]
}

export default function TableCard({ title, rows }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const bodyCells = rows
      .map((r) => `<tr><td style="border:1px solid #ccc;padding:6px 10px;font-weight:600;background:#f9fafb;width:33%">${r.label}</td><td style="border:1px solid #ccc;padding:6px 10px">${r.value}</td></tr>`)
      .join('')
    const html = `<table style="border-collapse:collapse;width:100%"><tbody>${bodyCells}</tbody></table>`
    const plain = rows.map((r) => `${r.label}\t${r.value}`).join('\n')

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
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all
            ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'}`}
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <div className="p-4">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-3 text-gray-500 font-medium w-1/3 border border-gray-100">{r.label}</td>
                <td className="py-2 px-3 text-gray-800 border border-gray-100">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
