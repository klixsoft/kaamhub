export interface TextRun {
  text: string
  bold: boolean
}

export type LetterBlock = { kind: "heading" | "paragraph" | "bullet"; lines: TextRun[][] }

function runs(line: string): TextRun[] {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => (part.startsWith("**") && part.endsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }))
}

/*
 * Letter bodies use a deliberately small format so HR staff can write them in
 * a plain text box: blank lines separate paragraphs, "# " starts a heading,
 * "- " starts a bullet and **text** is bold.
 */
export function parseLetter(body: string): LetterBlock[] {
  const blocks: LetterBlock[] = []
  let paragraph: TextRun[][] = []
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", lines: paragraph })
    paragraph = []
  }
  for (const rawLine of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd()
    if (line.trim() === "") {
      flush()
    } else if (line.startsWith("# ")) {
      flush()
      blocks.push({ kind: "heading", lines: [runs(line.slice(2).trim())] })
    } else if (/^[-*] /.test(line.trimStart())) {
      flush()
      blocks.push({ kind: "bullet", lines: [runs(line.trimStart().slice(2))] })
    } else {
      paragraph.push(runs(line))
    }
  }
  flush()
  return blocks
}
