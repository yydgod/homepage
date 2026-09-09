import { getByPath } from './path'

/**
 * 渲染模板插值：
 * - {{value}}       responsePath 提取到的值
 * - {{value.xxx}}   提取值的子字段（点路径）
 * - {{data}}        完整响应
 * - {{data.xxx}}    完整响应的子字段（点路径）
 * 字段缺失时显示「—」，不抛错
 */
export function renderTemplate(template: string, context: { value: unknown; data: unknown }): string {
  if (!template) return '—'
  return template.replace(/\{\{\s*([A-Za-z0-9_.[\]-]+)\s*\}\}/g, (raw, expr: string) => {
    const path = expr.trim()
    if (path === 'value') return stringify(context.value)
    if (path === 'data') return stringify(context.data)
    if (path.startsWith('value.')) return stringify(getByPath(context.value, path.slice('value.'.length)))
    if (path.startsWith('data.')) return stringify(getByPath(context.data, path.slice('data.'.length)))
    return raw
  })
}

function stringify(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
