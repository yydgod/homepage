import { computed, ref, watch } from 'vue'
import type { WallpaperConfig } from '../types'
import { debounce, loadAppConfig, saveWallpaper } from '../utils/storage'
import { compressImage } from '../utils/image'

// 模块级单例：所有组件共享同一份壁纸状态
const wallpaper = ref<WallpaperConfig>(loadAppConfig().wallpaper)

const persist = debounce(() => saveWallpaper(wallpaper.value), 300)
watch(wallpaper, persist, { deep: true })

/** 未上传壁纸时使用当前主题的渐变背景 */
const DEFAULT_GRADIENT =
  'linear-gradient(135deg, rgb(var(--theme-from)) 0%, rgb(var(--theme-mid)) 50%, rgb(var(--theme-to)) 100%)'

export function useWallpaper() {
  /** 背景层样式：图片（或默认渐变）+ 填充方式 + 模糊与亮度 */
  const wallpaperStyle = computed(() => ({
    backgroundImage: wallpaper.value.imageBase64 ? `url(${wallpaper.value.imageBase64})` : DEFAULT_GRADIENT,
    backgroundSize: wallpaper.value.fillMode === 'tile' ? 'auto' : wallpaper.value.fillMode,
    backgroundRepeat: wallpaper.value.fillMode === 'tile' ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center',
    filter: `blur(${wallpaper.value.blur}px) brightness(${wallpaper.value.brightness})`,
  }))

  /** 遮罩层样式：颜色 + 不透明度 */
  const overlayStyle = computed(() => ({
    backgroundColor: wallpaper.value.overlayColor,
    opacity: wallpaper.value.overlayOpacity,
  }))

  /** 上传本地图片：压缩后写入配置（自动触发持久化） */
  async function uploadImage(file: File) {
    const base64 = await compressImage(file)
    wallpaper.value.imageBase64 = base64
  }

  function updateStyle(patch: Partial<WallpaperConfig>) {
    wallpaper.value = { ...wallpaper.value, ...patch }
  }

  function removeWallpaper() {
    wallpaper.value.imageBase64 = ''
  }

  return { wallpaper, wallpaperStyle, overlayStyle, uploadImage, updateStyle, removeWallpaper }
}
