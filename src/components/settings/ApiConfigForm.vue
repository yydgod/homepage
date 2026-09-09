<script setup lang="ts">
import { reactive } from 'vue'
import type { ApiConfig, WidgetConfig } from '../../types'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'save', patch: Partial<WidgetConfig>): void
  (e: 'back'): void
}>()

interface KeyValueRow {
  key: string
  value: string
}

const source = props.widget.api

const form = reactive<ApiConfig>({
  url: source?.url ?? '',
  method: source?.method ?? 'GET',
  headers: source?.headers?.length ? source.headers.map((h) => ({ ...h })) : [],
  params: source?.params?.length ? source.params.map((p) => ({ ...p })) : [],
  body: source?.body ?? '',
  timeout: source?.timeout ?? 8000,
  refreshInterval: source?.refreshInterval ?? 0,
  responsePath: source?.responsePath ?? '',
  renderTemplate: source?.renderTemplate ?? '{{value}}',
})

function addRow(list: KeyValueRow[]) {
  list.push({ key: '', value: '' })
}

function removeRow(list: KeyValueRow[], index: number) {
  list.splice(index, 1)
}

function submit() {
  emit('save', {
    title: form.url ? props.widget.title : props.widget.title,
    api: {
      ...form,
      headers: form.headers.filter((h) => h.key.trim()),
      params: form.params.filter((p) => p.key.trim()),
      timeout: Number(form.timeout) || 8000,
      refreshInterval: Number(form.refreshInterval) || 0,
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
      <h3 class="text-sm font-medium text-white/85">请求配置</h3>
      <div class="flex gap-2">
        <select v-model="form.method" class="glass-input w-28 shrink-0 cursor-pointer !appearance-none bg-slate-800/60">
          <option v-for="m in ['GET', 'POST', 'PUT', 'DELETE']" :key="m" :value="m">{{ m }}</option>
        </select>
        <input v-model="form.url" type="text" placeholder="接口地址，如 https://v1.hitokoto.cn" class="glass-input" />
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs text-white/60">Query 参数</label>
          <button class="flex cursor-pointer items-center gap-1 text-xs text-primary-purple hover:text-white" @click="addRow(form.params)">
            <Plus :size="12" /> 添加
          </button>
        </div>
        <div class="space-y-2">
          <div v-for="(row, i) in form.params" :key="i" class="flex gap-2">
            <input v-model="row.key" type="text" placeholder="参数名" class="glass-input !w-2/5" />
            <input v-model="row.value" type="text" placeholder="参数值" class="glass-input" />
            <button class="shrink-0 cursor-pointer px-1 text-white/40 hover:text-red-300" @click="removeRow(form.params, i)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs text-white/60">请求头 Headers</label>
          <button class="flex cursor-pointer items-center gap-1 text-xs text-primary-purple hover:text-white" @click="addRow(form.headers)">
            <Plus :size="12" /> 添加
          </button>
        </div>
        <div class="space-y-2">
          <div v-for="(row, i) in form.headers" :key="i" class="flex gap-2">
            <input v-model="row.key" type="text" placeholder="如 Authorization" class="glass-input !w-2/5" />
            <input v-model="row.value" type="text" placeholder="值" class="glass-input" />
            <button class="shrink-0 cursor-pointer px-1 text-white/40 hover:text-red-300" @click="removeRow(form.headers, i)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="form.method !== 'GET'">
        <label class="mb-1.5 block text-xs text-white/60">请求体 Body（JSON 文本）</label>
        <textarea
          v-model="form.body"
          rows="4"
          placeholder='{"key": "value"}'
          class="glass-input resize-none font-mono !text-xs leading-relaxed"
        />
      </div>
    </section>

    <section class="space-y-3">
      <h3 class="text-sm font-medium text-white/85">刷新策略</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1.5 block text-xs text-white/60">超时（毫秒）</label>
          <input v-model.number="form.timeout" type="number" min="1000" step="500" class="glass-input" />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/60">轮询间隔（秒，0 关闭）</label>
          <input v-model.number="form.refreshInterval" type="number" min="0" step="5" class="glass-input" />
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <h3 class="text-sm font-medium text-white/85">内容渲染</h3>
      <div>
        <label class="mb-1.5 block text-xs text-white/60">数据字段路径</label>
        <input v-model="form.responsePath" type="text" placeholder="如 data.list[0].temp，留空使用完整响应" class="glass-input font-mono !text-xs" />
      </div>
      <div>
        <label class="mb-1.5 block text-xs text-white/60">渲染模板</label>
        <textarea
          v-model="form.renderTemplate"
          rows="3"
          placeholder="如 当前温度：{{value}}℃"
          class="glass-input resize-none font-mono !text-xs leading-relaxed"
        />
        <p v-pre class="mt-1.5 text-xs leading-relaxed text-white/35">
          支持 {{value}}（提取值）、{{value.xxx}}（子字段）、{{data}}（完整响应）；字段缺失显示「—」。
        </p>
      </div>
    </section>

    <button class="glass-btn-primary w-full !py-2.5" @click="submit">
      <Save :size="15" />
      保存并应用
    </button>
  </div>
</template>
