import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function parsePdfText(buffer: Buffer): Promise<string> {
  const tmpFile = join(tmpdir(), `${randomUUID()}.pdf`)
  try {
    writeFileSync(tmpFile, buffer)
    // pdftotext -layout preserves table structure and column alignment
    const text = execSync(`pdftotext -layout "${tmpFile}" -`, {
      maxBuffer: 10 * 1024 * 1024,
    }).toString()
    return text.trim()
  } catch {
    // fallback to unpdf if pdftotext not available
    try {
      const { extractText } = await import('unpdf')
      const pdf = await extractText(new Uint8Array(buffer), { mergePages: true })
      return pdf.text
    } catch {
      return ''
    }
  } finally {
    try {
      unlinkSync(tmpFile)
    } catch {}
  }
}
