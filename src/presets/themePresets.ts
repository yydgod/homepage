export interface ThemePreset {
  id: string
  name: string
  colors: [string, string, string]
}

/** 内置渐变主题：极光蓝紫（默认）、海洋、翡翠、日落、樱花、青柠、烈焰、午夜 */
export const THEME_PRESETS: ThemePreset[] = [
  { id: 'aurora', name: '极光蓝紫', colors: ['#6366F1', '#8B5CF6', '#EC4899'] },
  { id: 'ocean', name: '深海蓝', colors: ['#0EA5E9', '#2563EB', '#7C3AED'] },
  { id: 'emerald', name: '翡翠绿', colors: ['#10B981', '#14B8A6', '#0EA5E9'] },
  { id: 'sunset', name: '落日橙', colors: ['#F59E0B', '#F97316', '#EF4444'] },
  { id: 'sakura', name: '樱花粉', colors: ['#F472B6', '#EC4899', '#A855F7'] },
  { id: 'lime', name: '青柠', colors: ['#84CC16', '#10B981', '#06B6D4'] },
  { id: 'flame', name: '烈焰红', colors: ['#F97316', '#EF4444', '#DB2777'] },
  { id: 'midnight', name: '午夜蓝', colors: ['#475569', '#6366F1', '#2563EB'] },
]

export const DEFAULT_THEME = THEME_PRESETS[0]

/** 根据 ID 查找预设 */
export function findThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id)
}
