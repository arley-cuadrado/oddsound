type LexicalNode = {
  children?: LexicalNode[]
  text?: string
  type?: string
}

const blockTypes = new Set(['heading', 'listitem', 'paragraph', 'quote'])

function visit(node: LexicalNode): string {
  const text = typeof node.text === 'string' ? node.text : ''
  const childrenText = Array.isArray(node.children) ? node.children.map(visit).join('') : ''
  const combined = `${text}${childrenText}`.trim()

  if (!combined) return ''

  return blockTypes.has(node.type || '') ? `${combined}\n` : combined
}

export function extractLexicalPlainText(content: unknown): string {
  if (!content || typeof content !== 'object' || !('root' in content)) return ''

  const root = (content as { root?: LexicalNode }).root
  if (!root) return ''

  return visit(root)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}
