<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { ChatMessage, WidgetConfig } from '../../types'
import { debounce } from '../../utils/storage'
import { Send, Sparkles, Trash2 } from 'lucide-vue-next'

// GFM 语法（表格/任务列表/删除线）+ 换行转 <br>
marked.setOptions({ gfm: true, breaks: true })

/** 已完成的 AI 回复渲染结果缓存（流式中的消息每次都重新解析） */
const htmlCache = new WeakMap<ChatMessage, string>()

function markdownHtml(msg: ChatMessage): string {
  const isStreaming = sending.value && msg === messages.value[messages.value.length - 1]
  if (!isStreaming) {
    const cached = htmlCache.get(msg)
    if (cached !== undefined) return cached
  }
  const raw = marked.parse(msg.content, { async: false }) as string
  const html = DOMPurify.sanitize(raw)
  htmlCache.set(msg, html)
  return html
}

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<WidgetConfig>): void
}>()

const input = ref('')
const sending = ref(false)
const errorText = ref('')
const listEl = ref<HTMLDivElement | null>(null)

const messages = ref<ChatMessage[]>([...(props.widget.chatMessages ?? [])])

const persistMessages = debounce(() => {
  emit('update', { chatMessages: [...messages.value] })
}, 300)

watch(messages, persistMessages, { deep: true })

function scrollToBottom() {
  void nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

async function send() {
  const content = input.value.trim()
  const chat = props.widget.chat
  if (!content || sending.value) return
  if (!chat?.apiKey) {
    errorText.value = '未配置 API Key，请点击右上角编辑按钮填写'
    return
  }
  errorText.value = ''
  input.value = ''
  messages.value.push({ role: 'user', content })
  // 先放入空的 AI 消息占位（流式输出时实时填充）
  messages.value.push({ role: 'assistant', content: '' })
  const assistantMsg = messages.value[messages.value.length - 1]
  sending.value = true
  scrollToBottom()

  const baseUrl = (chat.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')
  const body = {
    model: chat.model || 'deepseek-chat',
    messages: [
      ...(chat.systemPrompt ? [{ role: 'system', content: chat.systemPrompt }] : []),
      // 请求携带的历史不包含空占位消息
      ...messages.value.filter((m) => m !== assistantMsg),
    ],
    stream: true,
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 120000)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chat.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status} ${text.slice(0, 160)}`)
    }
    if (!response.body) throw new Error('当前浏览器不支持流式响应')

    // 流式解析 SSE（data: {...} 行），逐 token 追加到占位消息
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          assistantMsg.content += delta
          scrollToBottom()
        }
      }
    }

    // 流结束后仍是空内容则移除占位（无有效回复）
    if (!assistantMsg.content) {
      const index = messages.value.indexOf(assistantMsg)
      if (index >= 0) messages.value.splice(index, 1)
      errorText.value = '模型未返回内容'
    }
  } catch (err) {
    const e = err as Error
    console.error('DeepSeek 请求失败', e)
    errorText.value = e.name === 'AbortError' ? '请求超时（120s）' : e.message
    // 失败时移除空占位消息；已有部分内容则保留
    const index = messages.value.indexOf(assistantMsg)
    if (index >= 0 && !assistantMsg.content) {
      messages.value.splice(index, 1)
    }
  } finally {
    window.clearTimeout(timeoutId)
    sending.value = false
    scrollToBottom()
  }
}

function clearChat() {
  messages.value = []
  errorText.value = ''
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 消息列表 -->
    <div ref="listEl" class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2.5 pt-6">
      <div v-if="messages.length === 0" class="flex flex-1 flex-col items-center justify-center gap-1.5 text-center opacity-45">
        <Sparkles :size="20" />
        <div class="text-[0.75em]">与 DeepSeek 开始对话吧</div>
      </div>

      <template v-for="(msg, i) in messages" :key="i">
        <!-- 用户消息：右侧主题渐变气泡 -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[85%] rounded-xl rounded-br-sm bg-gradient-to-br from-primary to-primary-pink px-3 py-1.5 text-[0.78em] leading-relaxed shadow-md">
            {{ msg.content }}
          </div>
        </div>
        <!-- AI 回复：左侧玻璃气泡（markdown 渲染）；空内容占位时显示思考动画 -->
        <div v-else class="flex justify-start">
          <div
            v-if="msg.content"
            class="chat-markdown max-w-[85%] rounded-xl rounded-bl-sm border border-white/10 bg-white/10 px-3 py-1.5 text-[0.78em] leading-relaxed"
            v-html="markdownHtml(msg)"
          />
          <div v-else class="flex items-center gap-1 rounded-xl rounded-bl-sm border border-white/10 bg-white/10 px-3 py-2">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" style="animation-delay: 0.15s" />
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" style="animation-delay: 0.3s" />
          </div>
        </div>
      </template>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorText" class="px-3 pb-1 text-[0.68em] text-red-300/90">{{ errorText }}</div>

    <!-- 输入区 -->
    <div class="flex shrink-0 items-center gap-1.5 border-t border-white/10 px-2.5 py-2">
      <input
        v-model="input"
        type="text"
        placeholder="输入消息，回车发送"
        class="w-full bg-transparent text-[0.78em] outline-none placeholder:text-white/35"
        @keyup.enter="send"
      />
      <button
        class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/40 transition-all hover:bg-white/10 hover:text-white"
        title="清空对话"
        @click="clearChat"
      >
        <Trash2 :size="12" />
      </button>
      <button
        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-pink text-white shadow-md transition-all duration-200 hover:scale-110 active:scale-95"
        title="发送"
        @click="send"
      >
        <Send :size="13" />
      </button>
    </div>
  </div>
</template>
