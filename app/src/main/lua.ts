export function luaString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')

    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  return `"${escaped}"`
}

export function luaKey(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`
}

export function toLua(value: unknown, indent = 1): string {
  const pad = '\t'.repeat(indent)
  const closePad = '\t'.repeat(Math.max(indent - 1, 0))

  if (value === null || value === undefined) return 'nil'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0'
  }
  if (typeof value === 'string') return luaString(value)

  if (Array.isArray(value)) {
    if (!value.length) return '{}'
    const items = value.map((item) => `${pad}${toLua(item, indent + 1)},`)
    return `{\n${items.join('\n')}\n${closePad}}`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    )
    if (!entries.length) return '{}'
    const items = entries.map(([k, v]) => `${pad}${luaKey(k)} = ${toLua(v, indent + 1)},`)
    return `{\n${items.join('\n')}\n${closePad}}`
  }

  return 'nil'
}
