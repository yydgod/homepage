<script setup lang="ts">
import { ref } from 'vue'
import type { HaConfig, HaEntityItem, WidgetConfig } from '../../types'
import { ArrowLeft, Gauge, Plus, Save, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'save', patch: Partial<WidgetConfig>): void
  (e: 'back'): void
}>()

const baseUrl = ref(props.widget.ha?.baseUrl ?? '')
const token = ref(props.widget.ha?.token ?? '')
const entities = ref<HaEntityItem[]>(props.widget.ha?.entities?.map((e) => ({ ...e })) ?? [])
const chartEntityId = ref(props.widget.ha?.chartEntityId ?? '')
const chartHours = ref(props.widget.ha?.chartHours ?? 24)
const refreshInterval = ref(props.widget.ha?.refreshInterval ?? 30)

function addEntity() {
  entities.value.push({ id: '', label: '', unit: '' })
}

function removeEntity(index: number) {
  entities.value.splice(index, 1)
}

function submit() {
  const url = baseUrl.value.trim().replace(/\/+$/, '')
  if (!url || !token.value.trim() || entities.value.length === 0) return
  const cleaned = entities.value
    .map((e) => ({ id: e.id.trim(), label: e.label?.trim() || undefined, unit: e.unit?.trim() || undefined }))
    .filter((e) => e.id)
  if (cleaned.length === 0) return
  const ha: HaConfig = {
    baseUrl: url,
    token: token.value.trim(),
    entities: cleaned,
    chartEntityId: chartEntityId.value.trim() || cleaned[0].id,
    chartHours: chartHours.value,
    refreshInterval: refreshInterval.value,
  }
  emit('save', { ha })
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
        <Gauge :size="16" class="text-primary" />
        <h3 class="text-sm font-medium text-white/85">Home Assistant 连接</h3>
      </div>
      <div class="space-y-2">
        <input v-model="baseUrl" type="text" placeholder="HA 地址，如 http://192.168.1.10:8123" class="glass-input font-mono !text-xs" />
        <input v-model="token" type="password" placeholder="长期访问令牌（个人资料页创建）" class="glass-input font-mono !text-xs" />
      </div>
      <p class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/45">
        令牌在 HA 前端「个人资料 → 长期访问令牌」创建。由于起始页以 file:// 打开，需在 HA 的 configuration.yaml 中允许跨域：
        <code class="rounded bg-white/10 px-1 py-0.5 text-[11px] text-white/70">http: cors_allowed_origins: ["null"]</code>
        （或通过 HTTPS 反代访问并加入对应域名）。
      </p>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-white/85">家电实体</h3>
        <button class="flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/10" @click="addEntity">
          <Plus :size="12" />
          添加实体
        </button>
      </div>
      <div class="space-y-2">
        <div v-for="(item, index) in entities" :key="index" class="flex items-center gap-2">
          <input v-model="item.id" type="text" placeholder="实体 ID，如 sensor.temp_1" class="glass-input min-w-0 flex-1 font-mono !text-xs" />
          <input v-model="item.label" type="text" placeholder="显示名（可选）" class="glass-input !w-24 !text-xs" />
          <input v-model="item.unit" type="text" placeholder="单位" class="glass-input !w-14 !text-xs" />
          <button class="shrink-0 cursor-pointer text-white/40 transition-colors hover:text-red-300" title="删除" @click="removeEntity(index)">
            <Trash2 :size="13" />
          </button>
        </div>
        <p v-if="entities.length === 0" class="text-xs text-white/40">尚未添加实体，点击右上角「添加实体」</p>
      </div>
    </section>

    <section class="space-y-3">
      <h3 class="text-sm font-medium text-white/85">统计图</h3>
      <div class="flex items-center gap-2">
        <input v-model="chartEntityId" type="text" placeholder="统计实体 ID（默认取第一个实体）" class="glass-input min-w-0 flex-1 font-mono !text-xs" />
        <select v-model.number="chartHours" class="glass-input !w-24 !text-xs">
          <option :value="1">1 小时</option>
          <option :value="6">6 小时</option>
          <option :value="24">24 小时</option>
          <option :value="168">7 天</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <span class="shrink-0 text-xs text-white/50">状态刷新间隔</span>
        <select v-model.number="refreshInterval" class="glass-input !w-24 !text-xs">
          <option :value="10">10 秒</option>
          <option :value="30">30 秒</option>
          <option :value="60">1 分钟</option>
          <option :value="300">5 分钟</option>
        </select>
      </div>
      <p class="text-xs leading-relaxed text-white/40">统计图仅对数值型实体生效（温度、湿度、功率、电量等），时间范围也可在插件卡片的图表右上角随时切换。</p>
    </section>

    <button
      class="glass-btn-primary w-full !py-2.5"
      :disabled="!baseUrl.trim() || !token.trim() || entities.filter((e) => e.id.trim()).length === 0"
      @click="submit"
    >
      <Save :size="15" />
      保存并应用
    </button>
  </div>
</template>
