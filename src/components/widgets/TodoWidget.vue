<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TodoItem, WidgetConfig } from '../../types'
import { uid } from '../../utils/id'
import { Check, Plus, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<WidgetConfig>): void
}>()

const newText = ref('')

const todos = computed(() => props.widget.todos ?? [])
const pendingCount = computed(() => todos.value.filter((t) => !t.done).length)

function addTodo() {
  const text = newText.value.trim()
  if (!text) return
  const item: TodoItem = { id: uid('td'), text, done: false }
  emit('update', { todos: [...todos.value, item] })
  newText.value = ''
}

function toggleTodo(item: TodoItem) {
  emit('update', {
    todos: todos.value.map((t) => (t.id === item.id ? { ...t, done: !t.done } : t)),
  })
}

function removeTodo(id: string) {
  emit('update', { todos: todos.value.filter((t) => t.id !== id) })
}
</script>

<template>
  <div class="flex h-full flex-col px-3 pb-3 pt-2">
    <div v-if="pendingCount > 0" class="mb-1.5 text-[0.75em] opacity-50">还有 {{ pendingCount }} 项待完成</div>
    <div class="min-h-0 flex-1 overflow-y-auto pr-0.5">
      <div v-if="todos.length === 0" class="py-6 text-center text-[0.75em] opacity-40">暂无待办，添加一条吧</div>
      <ul v-else class="space-y-1.5">
        <li
          v-for="item in todos"
          :key="item.id"
          class="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
        >
          <button
            class="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all"
            :class="item.done ? 'border-primary bg-primary' : 'border-white/40 hover:border-white/70'"
            @click="toggleTodo(item)"
          >
            <Check v-if="item.done" :size="10" class="text-white" />
          </button>
          <span
            class="min-w-0 flex-1 break-words text-[0.875em] leading-snug transition-all"
            :class="item.done ? 'opacity-40 line-through' : ''"
          >
            {{ item.text }}
          </span>
          <button
            class="shrink-0 cursor-pointer text-white/30 opacity-0 transition-all hover:text-red-300 group-hover:opacity-100"
            @click="removeTodo(item.id)"
          >
            <Trash2 :size="13" />
          </button>
        </li>
      </ul>
    </div>
    <div class="mt-2 flex items-center gap-2">
      <input
        v-model="newText"
        type="text"
        placeholder="添加待办，回车确认"
        class="glass-input !py-1.5 !text-xs !text-inherit placeholder:!text-white/40"
        @keyup.enter="addTodo"
      />
      <button class="glass-btn-primary !rounded-lg !px-2.5 !py-1.5" @click="addTodo">
        <Plus :size="14" />
      </button>
    </div>
  </div>
</template>
