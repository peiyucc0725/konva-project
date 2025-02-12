import { defineStore } from 'pinia'

export const useLayerStore = defineStore('layer', () => {
  const layer = ref(null)

  const nodeLength = computed(() => layer.value?.children.length)

  const setLayer = (val) => {
    layer.value = val
  }

  const addShapeIntoLayer = (shape) => {
    layer.value.add(shape)
  }

  return { layer, setLayer, addShapeIntoLayer, nodeLength }
})
