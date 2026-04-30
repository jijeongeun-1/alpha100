'use client'

const MAX = 1000

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function MemoInput({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">
        보충 메모
        <span className="ml-2 text-xs font-normal text-gray-400">선택</span>
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX))}
        rows={4}
        placeholder="파일로 파악하기 어려운 내용을 자유롭게 입력하세요. (예: 특이사항, 강조할 내용)"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
      />
      <p className="text-right text-xs text-gray-400 mt-1">{value.length} / {MAX}</p>
    </div>
  )
}
