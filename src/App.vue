<script setup>
import Editor from '@/components/Editor/index.vue'

const handlePreventDefault = (e) => {
  e.preventDefault()
}

onBeforeMount(() => {
  window.addEventListener('contextmenu', handlePreventDefault)
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', handlePreventDefault)
})
</script>

<template>
  <Editor />
</template>

<style lang="scss" scoped>
</style>
