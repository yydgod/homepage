<script setup lang="ts">
import { reactive } from 'vue'
import type { ChatConfig, WidgetConfig } from '../../types'
import { ArrowLeft, Save, Sparkles } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'save', patch: Partial<WidgetConfig>): void
  (e: 'back'): void
}>()

const source = props.widget.chat

const form = reactive<ChatConfig>({
  apiKey: source?.apiKey ?? '',
  model: source?.model ?? 'deepseek-chat',
  systemPrompt: source?.systemPrompt ?? '',
  baseUrl: source?.baseUrl ?? '',
})

function submit() {
  if (!form.apiKey.trim()) return
  emit('save', {
    chat: {
      apiKey: form.apiKey.trim(),
      model: form.model,
      systemPrompt: form.systemPrompt.trim() || undefined,
      baseUrl: form.baseUrl.trim() || undefined,
    },
  })
}
</script>

<template>
  <div class="space-y-6">
    <button class="flex cursor-pointer items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white" @click="emit('back')">
      <ArrowLeft :size="13" />
      返回插件列表
    </button>

    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <Sparkles :size="16" class="text-primary" />
        <h3 class="text-sm font-medium text-white/85">DeepSeek 对话配置</h3>
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-white/60">API Key（必填）</label>
        <input v-model="form.apiKey" type="password" placeholder="sk-..." class="glass-input font-mono !text-xs" />
        <p class="mt-1.5 text-xs text-white/35">在 platform.deepseek.com 注册后创建 API Key，仅保存在本地浏览器。</p>
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-white/60">模型</label>
        <select v-model="form.model" class="glass-input cursor-pointer !appearance-none bg-slate-800/60">
          <option value="deepseek-chat">deepseek-chat（通用对话）</option>
          <option value="deepseek-reasoner">deepseek-reasoner（深度推理）</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-white/60">系统提示词（可选）</label>
        <textarea
          v-model="form.systemPrompt"
          rows="3"
          placeholder="如：你是一个友好的中文助手"
          class="glass-input resize-none !text-xs leading-relaxed"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-white/60">API 地址（可选，默认官方地址）</label>
        <input v-model="form.baseUrl" type="text" placeholder="https://api.deepseek.com" class="glass-input font-mono !text-xs" />
      </div>
    </section>

    <button class="glass-btn-primary w-full !py-2.5" :disabled="!form.apiKey.trim()" @click="submit">
      <Save :size="15" />
      保存并应用
    </button>
  </div>
</template>
