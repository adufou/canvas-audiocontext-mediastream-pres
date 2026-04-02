import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
      meta: { title: 'Web API Deep Dive' },
    },
    {
      path: '/canvas',
      component: () => import('../views/CanvasDemo.vue'),
      meta: { title: 'Canvas API' },
    },
    {
      path: '/audiocontext',
      component: () => import('../views/AudioContextDemo.vue'),
      meta: { title: 'AudioContext API' },
    },
    {
      path: '/mediastream',
      component: () => import('../views/MediaStreamDemo.vue'),
      meta: { title: 'MediaStream API' },
    },
  ],
})
