<script setup lang="ts">
defineProps<{
  title: string
  lang?: string
  code: string
}>()
</script>

<template>
  <div class="code-panel">
    <div class="code-panel-header">
      <span>{{ title }}</span>
      <span>{{ lang ?? 'JS' }}</span>
    </div>
    <pre><code v-html="code" /></pre>
  </div>
</template>
