<script setup lang="ts">
defineProps<{
  number: number
  title: string
}>()
</script>

<template>
  <div class="step">
    <div class="step-header">
      <div class="step-number">{{ number }}</div>
      <h3>{{ title }}</h3>
    </div>
    <div class="step-body">
      <div><slot /></div>
      <slot name="code" />
    </div>
  </div>
</template>
