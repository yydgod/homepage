import { ref, watch } from 'vue'
import type { ThemeConfig } from '../types'
import { debounce, loadAppConfig, saveTheme } from '../utils/storage'
import { hexToRgbTriplet } from '../utils/color'

// 模块级单例：全局主题状态
const theme = ref<ThemeConfig>(loadAppConfig().theme)

const persist = debounce(() => saveTheme(theme.value), 300)
watch(theme, persist, { deep: true })

/** 将主题三色写入 CSS 变量，Tailwind primary 色系自动跟随 */
function applyThemeToDom() {
  const [from, mid, to] = theme.value.colors
  const root = document.documentElement
  root.style.setProperty('--theme-from', hexToRgbTriplet(from))
  root.style.setProperty('--theme-mid', hexToRgbTriplet(mid))
  root.style.setProperty('--theme-to', hexToRgbTriplet(to))
}

watch(theme, applyThemeToDom, { deep: true, immediate: true })

export function useTheme() {
  /** 切换到某个主题（预设 ID + 三色） */
  function applyTheme(next: ThemeConfig) {
    theme.value = { ...next, colors: [...next.colors] as ThemeConfig['colors'] }
  }

  return { theme, applyTheme }
}
