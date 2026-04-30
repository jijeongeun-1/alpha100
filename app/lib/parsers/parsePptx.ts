// eslint-disable-next-line @typescript-eslint/no-require-imports
const officeParser = require('officeparser')

export async function parsePptxText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(buffer, (data: string, err: Error) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}
