<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const pages = [
  { label: 'Canvas',       to: '/canvas' },
  { label: 'AudioContext', to: '/audiocontext' },
  { label: 'MediaStream',  to: '/mediastream' },
]
</script>

<template>
  <nav class="demo-nav">
    <RouterLink class="back-link" to="/">← All demos</RouterLink>
    <span class="nav-title">{{ route.meta.title as string }}</span>
    <div class="nav-pills">
      <RouterLink
        v-for="page in pages"
        :key="page.to"
        :to="page.to"
        class="nav-pill"
        :class="{ active: route.path === page.to }"
      >{{ page.label }}</RouterLink>
    </div>
  </nav>
</template>
