type LexicalRoot = {
  root: {
    children: unknown[]
    direction: 'ltr'
    format: ''
    indent: 0
    type: 'root'
    version: 1
  }
}

function paragraph(text: string) {
  return {
    children: [
      {
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        type: 'text',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    type: 'paragraph',
    version: 1,
  }
}

/** Minimal Lexical document, enough for seeded prose. */
export function richText(...paragraphs: string[]): LexicalRoot {
  return {
    root: {
      children: paragraphs.map(paragraph),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}
