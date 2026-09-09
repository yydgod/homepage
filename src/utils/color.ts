/**
 * hex 颜色转 Tailwind 兼容的 RGB 分量字符串（"r g b"），
 * 供 CSS 变量 `rgb(var(--theme-x) / <alpha>)` 使用。
 * 支持 #RGB 与 #RRGGBB 两种格式。
 */
export function hexToRgbTriplet(hex: string): string {
  let value = hex.replace('#', '').trim()
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return '99 102 241'
  const num = parseInt(value, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r} ${g} ${b}`
}
