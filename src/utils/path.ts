/**
 * 点路径取值：支持 data.list[0].name 语法
 * 路径缺失或字段不存在时返回 undefined，由调用方兜底展示
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || obj == null) return path ? undefined : obj
  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let current: unknown = obj
  for (const segment of segments) {
    if (current == null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}
