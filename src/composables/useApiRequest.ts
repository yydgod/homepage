import { onUnmounted, ref, watch } from 'vue'
import type { ApiConfig } from '../types'
import { getByPath } from '../utils/path'
import { renderTemplate } from '../utils/template'

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * 通用 API 请求封装：
 * - fetch + AbortController 超时与卸载取消
 * - setInterval 轮询（refreshInterval > 0）
 * - 响应路径提取 + 模板渲染
 * - loading / success / error 三态与重试
 * 配置变化时自动重新请求并重建轮询
 */
export function useApiRequest(apiGetter: () => ApiConfig | undefined) {
  const status = ref<RequestStatus>('idle')
  const rendered = ref('')
  const errorMessage = ref('')
  const rawData = ref<unknown>(null)

  let controller: AbortController | null = null
  let pollTimer: number | null = null

  async function request() {
    const cfg = apiGetter()
    if (!cfg || !cfg.url) {
      status.value = 'idle'
      return
    }
    controller?.abort()
    controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller?.abort(), cfg.timeout || 8000)
    status.value = 'loading'

    try {
      const response = await fetch(buildUrl(cfg), buildInit(cfg))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      rawData.value = data
      const value = getByPath(data, cfg.responsePath)
      rendered.value = renderTemplate(cfg.renderTemplate, { value, data })
      status.value = 'success'
      errorMessage.value = ''
    } catch (e) {
      const err = e as Error
      if (err.name !== 'AbortError') {
        console.error('API 请求失败', err)
        errorMessage.value = err.message || '请求失败'
        status.value = 'error'
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  function buildInit(cfg: ApiConfig): RequestInit {
    const headers: Record<string, string> = {}
    for (const h of cfg.headers) {
      if (h.key) headers[h.key] = h.value
    }
    const init: RequestInit = { method: cfg.method, headers, signal: controller!.signal }
    if (cfg.method !== 'GET' && cfg.body) {
      init.headers = { ...headers, 'Content-Type': 'application/json' }
      init.body = cfg.body
    }
    return init
  }

  function buildUrl(cfg: ApiConfig): string {
    const url = new URL(cfg.url)
    for (const p of cfg.params) {
      if (p.key) url.searchParams.set(p.key, p.value)
    }
    return url.toString()
  }

  function clearPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function schedulePolling() {
    clearPolling()
    const interval = apiGetter()?.refreshInterval ?? 0
    if (interval > 0) {
      pollTimer = window.setInterval(() => {
        void request()
      }, interval * 1000)
    }
  }

  function retry() {
    void request()
  }

  // 配置变化（URL/method/参数/模板等）时：立即请求 + 重建轮询
  watch(apiGetter, () => {
    void request()
    schedulePolling()
  }, { deep: true })

  onUnmounted(() => {
    clearPolling()
    controller?.abort()
  })

  void request()
  schedulePolling()

  return { status, rendered, errorMessage, rawData, retry }
}
