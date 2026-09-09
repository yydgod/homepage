<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { THEME_PRESETS } from '../../presets/themePresets'
import { Check, Palette } from 'lucide-vue-next'

const { theme, applyTheme } = useTheme()

const isCustom = computed(() => theme.value.presetId === 'custom')

const customColors = ref<[string, string, string]>(
  isCustom.value ? [...theme.value.colors] : [...THEME_PRESETS[0].colors],
)

function gradientOf(colors: string[]): string {
  return `linear-gradient(135deg, ${colors.join(', ')})`
}

function selectPreset(id: string) {
  const preset = THEME_PRESETS.find((p) => p.id === id)
  if (preset) applyTheme({ presetId: preset.id, colors: [...preset.colors] as [string, string, string] })
}

function applyCustom() {
  applyTheme({ presetId: 'custom', colors: [...customColors.value] as [string, string, string] })
}

/** 当前主题渐变预览 */
const previewGradient = computed(() => gradientOf(theme.value.colors))
</script>

<template>
  <div class="space-y-6">
    <!-- 实时预览 -->
    <div class="relative h-16 overflow-hidden rounded-xl border border-white/15" :style="{ background: previewGradient }">
      <span class="absolute bottom-1.5 left-3 text-xs font-medium text-white/90 drop-shadow">
        主题预览 · {{ isCustom ? '自定义' : '预设渐变' }}
      </span>
    </div>

    <div>
      <label class="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/60">
        <Palette :size="13" />
        预设渐变主题
      </label>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in THEME_PRESETS"
          :key="preset.id"
          class="flex cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200"
          :class="
            theme.presetId === preset.id
              ? 'border-primary/60 bg-white/10 shadow-lg shadow-primary/15'
              : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
          "
          @click="selectPreset(preset.id)"
        >
          <span
            class="h-7 w-12 shrink-0 rounded-lg border border-white/20 shadow-inner"
            :style="{ background: gradientOf(preset.colors) }"
          />
          <span class="min-w-0 flex-1 truncate text-left text-xs" :class="theme.presetId === preset.id ? 'text-white' : 'text-white/70'">
            {{ preset.name }}
          </span>
          <Check v-if="theme.presetId === preset.id" :size="13" class="shrink-0 text-primary" />
        </button>
      </div>
    </div>

    <div>
      <label class="mb-2 block text-xs font-medium text-white/60">自定义渐变（三色）</label>
      <div class="flex items-center gap-2.5">
        <input v-model="customColors[0]" type="color" class="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-white/10 p-1" />
        <input v-model="customColors[1]" type="color" class="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-white/10 p-1" />
        <input v-model="customColors[2]" type="color" class="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-white/10 p-1" />
      </div>
      <div class="mt-2 h-3 rounded-lg border border-white/10" :style="{ background: gradientOf(customColors) }" />
      <button class="glass-btn mt-3 w-full" @click="applyCustom">
        <Check :size="14" />
        应用自定义颜色
      </button>
    </div>
  </div>
</template>
