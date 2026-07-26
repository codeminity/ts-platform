export interface CodeBlock {
  code: string
  line: number
}

const SKIP_MARKER = '<!-- validate-docs:skip -->'

export function extractTypeScriptBlocks(markdown: string): CodeBlock[] {
  const lines = markdown.split('\n')
  const blocks: CodeBlock[] = []

  let index = 0

  while (index < lines.length) {
    /* v8 ignore next -- unreachable: index < lines.length guarantees this is defined */
    const line = lines[index] ?? ''
    const isFenceStart = /^```(ts|typescript)\b/.test(line.trim())

    if (!isFenceStart) {
      index += 1
      continue
    }

    const startLine = index + 1
    const previousLine = lines[index - 1]?.trim()
    const skip = previousLine === SKIP_MARKER

    index += 1

    const codeLines: string[] = []

    /* v8 ignore start -- unreachable: index < lines.length guarantees these are defined */
    while (index < lines.length && (lines[index] ?? '').trim() !== '```') {
      codeLines.push(lines[index] ?? '')
      index += 1
    }
    /* v8 ignore stop */

    index += 1 // skip the closing fence

    if (!skip) {
      blocks.push({ code: codeLines.join('\n'), line: startLine })
    }
  }

  return blocks
}
