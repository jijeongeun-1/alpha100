import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parsePdfText } from '@/app/lib/parsers/parsePdf'
import { parsePptxText } from '@/app/lib/parsers/parsePptx'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/app/lib/prompts'
import { loadExample } from '@/app/lib/loadExamples'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 120

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  try {
    if (ext === 'pdf') return await parsePdfText(buffer)
    if (ext === 'pptx') return await parsePptxText(buffer)
    return ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const projectType = formData.get('projectType') as string
    const memo = (formData.get('memo') as string) ?? ''

    let prevReportText = ''
    let workFilesText = ''
    let templateText = ''

    const entries = Array.from(formData.entries())

    for (const [key, value] of entries) {
      if (!(value instanceof File)) continue
      const buffer = Buffer.from(await value.arrayBuffer())
      const text = await extractText(buffer, value.name)

      if (key === 'prev-report') prevReportText += text
      else if (key === 'work') workFilesText += `\n--- ${value.name} ---\n${text}`
      else if (key === 'template') templateText += text
    }

    const exampleText = await loadExample(projectType)
    const userPrompt = buildUserPrompt({ projectType, prevReportText, workFilesText, templateText, memo, exampleText })

    // 개발 환경에서 조립된 프롬프트 전체를 터미널에 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '═'.repeat(60))
      console.log('📋 SYSTEM PROMPT:\n', SYSTEM_PROMPT)
      console.log('═'.repeat(60))
      console.log('📄 USER PROMPT:\n', userPrompt)
      console.log('═'.repeat(60) + '\n')
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 10000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const draft = JSON.parse(raw)

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('analyze error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
