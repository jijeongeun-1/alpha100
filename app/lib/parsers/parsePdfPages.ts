import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, readdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, basename } from 'path'
import { randomUUID } from 'crypto'

export async function parsePdfPages(
  buffer: Buffer,
  opts?: { dpi?: number },
): Promise<string[]> {
  const dpi = opts?.dpi ?? 150
  const id = randomUUID()
  const inputPath = join(tmpdir(), `pdf-input-${id}.pdf`)
  const outputPrefix = join(tmpdir(), `pdf-pages-${id}`)

  try {
    writeFileSync(inputPath, buffer)
    execSync(`pdftoppm -png -r ${dpi} "${inputPath}" "${outputPrefix}"`, {
      timeout: 60_000,
      maxBuffer: 200 * 1024 * 1024,
    })

    const dir = dirname(outputPrefix)
    const prefix = basename(outputPrefix)
    const pages = readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.png'))
      .sort()

    return pages.map((f) => {
      const data = readFileSync(join(dir, f))
      return `data:image/png;base64,${data.toString('base64')}`
    })
  } catch (err) {
    console.error('parsePdfPages error:', err)
    return []
  } finally {
    try { unlinkSync(inputPath) } catch {}
    try {
      const dir = dirname(outputPrefix)
      const prefix = basename(outputPrefix)
      readdirSync(dir)
        .filter((f) => f.startsWith(prefix) && f.endsWith('.png'))
        .forEach((f) => { try { unlinkSync(join(dir, f)) } catch {} })
    } catch {}
  }
}
