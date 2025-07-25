<script setup>
import { VNumberInput } from 'vuetify/labs/VNumberInput'
import logo from '/konva-logo_192x192.png'
import ColorPicker from '@/components/ColorPicker.vue'
import MaterialIconButton from '@/components/MaterialIconButton.vue'
import { useStageStore } from '@/stores/konva/stage'
import { useLayerStore } from '@/stores/konva/layer'
import { useShapeStore } from '@/stores/konva/shape'

const stageStore = useStageStore()
const layerStore = useLayerStore()
const shapeStore = useShapeStore()

const emit = defineEmits(['handleCopyStyle'])
const props = defineProps({
  copyStyleSource: {
    type: Object,
    default: null,
  },
})

const elementPositionAlign = reactive([
  { name: 'top', icon: 'mdi-align-vertical-top', text: 'Align Top' },
  { name: 'centerVertically', icon: 'mdi-align-vertical-center', text: 'Align Vertically Center' },
  { name: 'bottom', icon: 'mdi-align-vertical-bottom', text: 'Align Bottom' },
  { name: 'left', icon: 'mdi-align-horizontal-left', text: 'Align Left' },
  { name: 'centerHorizontally', icon: 'mdi-align-horizontal-center', text: 'Align Horizontally Center' },
  { name: 'right', icon: 'mdi-align-horizontal-right', text: 'Align Right' },
])
const elementPositionSpace = reactive([
  { name: 'vertical', icon: 'mdi-align-vertical-distribute', text: 'Spacing Evenly Vertically' },
  { name: 'horizontal', icon: 'mdi-align-horizontal-distribute', text: 'Spacing Evenly Horizontally' },
])
const elementPositionLayer = reactive([
  { name: 'up', icon: 'mdi-format-align-top', text: 'Up' },
  { name: 'toForward', icon: 'mdi-format-vertical-align-top', text: 'To Forward' },
  { name: 'down', icon: 'mdi-format-align-bottom', text: 'Down' },
  { name: 'toBottom', icon: 'mdi-format-vertical-align-bottom', text: 'To Bottom' },
])

const elementFontAttribute = computed(() => [
  {
    name: 'bold', icon: 'mdi-format-bold', text: 'Bold', variant: shapeStore.currentFontAttribute.bold ? 'tonal' : 'text',
  },
  {
    name: 'italic', icon: 'mdi-format-italic', text: 'Italic', variant: shapeStore.currentFontAttribute.italic ? 'tonal' : 'text',
  },
  {
    name: 'underline', icon: 'mdi-format-underline', text: 'Underline', variant: shapeStore.currentFontAttribute.underline ? 'tonal' : 'text',
  },
  {
    name: 'alignLeft', icon: 'mdi-format-align-left', text: 'Align Left', variant: shapeStore.currentFontAttribute.align === 'left' ? 'tonal' : 'text',
  },
  {
    name: 'alignCenter', icon: 'mdi-format-align-center', text: 'Align Center', variant: shapeStore.currentFontAttribute.align === 'center' ? 'tonal' : 'text',
  },
  {
    name: 'alignRight', icon: 'mdi-format-align-right', text: 'Align Right', variant: shapeStore.currentFontAttribute.align === 'right' ? 'tonal' : 'text',
  },
])

const stage = computed(() => stageStore.stage)
const layer = computed(() => layerStore.layer)
const selectedShape = computed(() => shapeStore.selectedShape)

const updateSelectedColor = (color) => {
  if (shapeStore.selectedShapeLength !== 1) return
  shapeStore.setCurrentColor(color)
  selectedShape.value[0].fill(color)
}

const setAlign = (alignType) => {
  if (!shapeStore.selectedShapeLength) return
  const minX = Math.min(...selectedShape.value.map((item) => item.absolutePosition().x))
  const maxX = Math.max(...selectedShape.value.map((item) => item.absolutePosition().x + item.width() * item.scaleX()))
  const minY = Math.min(...selectedShape.value.map((item) => item.absolutePosition().y))
  const maxY = Math.max(...selectedShape.value.map((item) => item.absolutePosition().y + item.height() * item.scaleY()))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  if (shapeStore.selectedShapeLength > 1) {
    selectedShape.value.forEach((shape) => {
      const absPos = shape.absolutePosition()
      switch (alignType) {
        case 'top':
          absPos.y = minY
          break
        case 'centerVertically':
          absPos.y = centerY - (shape.height() * shape.scaleY()) / 2
          break
        case 'bottom':
          absPos.y = maxY - (shape.height() * shape.scaleY())
          break
        case 'left':
          absPos.x = minX
          break
        case 'centerHorizontally':
          absPos.x = centerX - (shape.width() * shape.scaleX()) / 2
          break
        case 'right':
          absPos.x = maxX - shape.width() * shape.scaleX()
          break
        default:
          break
      }
      shape.absolutePosition(absPos)
    })
  } else {
    const absPos = selectedShape.value[0].absolutePosition()
    switch (alignType) {
      case 'top':
        absPos.y = 0
        break
      case 'centerVertically':
        absPos.y = stage.value.height() / 2 - selectedShape.value[0].height() * selectedShape.value[0].scaleY() / 2
        break
      case 'bottom':
        absPos.y = stage.value.height() - selectedShape.value[0].height() * selectedShape.value[0].scaleY()
        break
      case 'left':
        absPos.x = 0
        break
      case 'centerHorizontally':
        absPos.x = stage.value.width() / 2 - (selectedShape.value[0].width() * selectedShape.value[0].scaleX()) / 2
        break
      case 'right':
        absPos.x = stage.value.width() - selectedShape.value[0].width() * selectedShape.value[0].scaleX()
        break
      default:
        break
    }
    selectedShape.value[0].absolutePosition(absPos)
  }
}

const setSpacing = (spacingType) => {
  if (!shapeStore.selectedShapeLength) return
  let type = null
  switch (spacingType) {
    case 'vertical': {
      type = { pos: 'y', scale: 'scaleY', size: 'height' }
      break
    }
    case 'horizontal': {
      type = { pos: 'x', scale: 'scaleX', size: 'width' }
      break
    }
    default:
      return
  }

  selectedShape.value.sort((a, b) => a.absolutePosition()[type.pos] - b.absolutePosition()[type.pos])
  const min = selectedShape.value[0].absolutePosition()[type.pos]
  const max = selectedShape.value[shapeStore.selectedShapeLength - 1].absolutePosition()[type.pos] + selectedShape.value[shapeStore.selectedShapeLength - 1][type.size]() * selectedShape.value[shapeStore.selectedShapeLength - 1][type.scale]()
  const totalShape = selectedShape.value.reduce((n, item) => n + item[type.size]() * item[type.scale](), 0)
  const spacingDiff = (max - min - totalShape) / (shapeStore.selectedShapeLength - 1)
  selectedShape.value.forEach((shape, index) => {
    if (shape.absolutePosition()[type.pos] === min || shape.absolutePosition()[type.pos] + shape[type.size]() * shape[type.scale]() === max) return
    const absPos = shape.absolutePosition()
    absPos[type.pos] = selectedShape.value[index - 1].absolutePosition()[type.pos] + selectedShape.value[index - 1][type.size]() * selectedShape.value[index - 1][type.scale]() + spacingDiff
    shape.absolutePosition(absPos)
  })
}

const setZIndex = (zIndexType) => {
  if (!shapeStore.selectedShapeLength) return
  const zIndex = selectedShape.value[0].zIndex()
  const topZIndex = layerStore.nodeLength - 3
  if (zIndexType === 'up') {
    if (zIndex + 1 > topZIndex) return
    selectedShape.value[0].moveUp()
  } else if (zIndexType === 'down') {
    if (zIndex - 1 < 0) return
    selectedShape.value[0].moveDown()
  } else if (zIndexType === 'toForward') {
    selectedShape.value[0].zIndex(topZIndex)
  } else if (zIndexType === 'toBottom') {
    selectedShape.value[0].zIndex(0)
  }
  layer.value.batchDraw()
}
</script>

<template>
  <div class="editor-header">
    <div class="editor-header__logo">
      <VAvatar :image="logo" rounded="0" size="32" />
    </div>
    <div class="editor-header__element">
      <div class="editor-header__element-attribute">
        <template v-if="shapeStore.selectedShapeLength === 1">
          <VNumberInput v-if="shapeStore.currentShapeType === 'Text'"
            v-model:model-value="shapeStore.currentFontAttribute.fontSize" :min="1" :max="1000" :step="1"
            max-width="100" control-variant="stacked" variant="outlined" density="compact" single-line flat hide-details
            @update:model-value="shapeStore.setFontAttribute('fontSize', $event)" />
          <ColorPicker v-model="shapeStore.currentColor" @update:modelValue="updateSelectedColor">
            <template #button="{ props }">
              <v-btn v-bind="props" size="36" variant="text" rounded icon>
                <div class="d-flex flex-column align-center justify-center">
                  <v-icon>{{ shapeStore.currentShapeType === 'Text' ? 'mdi-format-color-text' : 'mdi-format-color-fill'
                    }}</v-icon>
                  <v-sheet :color="shapeStore.currentColor" height="4" width="20" tile />
                </div>
              </v-btn>
            </template>
          </ColorPicker>
          <template v-if="shapeStore.currentShapeType === 'Text'">
            <MaterialIconButton v-for="fontAttribute in elementFontAttribute" :key="fontAttribute.name"
              :icon="fontAttribute.icon" :variant="fontAttribute.variant" color="#0A1A26" :text="fontAttribute.text"
              @click="shapeStore.setFontAttribute(fontAttribute.name, !shapeStore.currentFontAttribute[fontAttribute.name])" />
          </template>
          <MaterialIconButton icon="mdi-format-paint" :variant="copyStyleSource ? 'tonal' : 'text'" color="#0A1A26"
            text="Copy Style" :disabled="!shapeStore.selectedShapeLength" @click="emit('handleCopyStyle', false)" />
        </template>
      </div>
      <div class="editor-header__element-position">
        <MaterialIconButton icon="fa:far fa-copy" variant="text" color="#0A1A26" text="Copy"
          :disabled="!shapeStore.selectedShapeLength" @click="shapeStore.pasteShape(null)" />
        <MaterialIconButton icon="fa:far fa-trash-can" variant="text" color="#0A1A26" text="Delete"
          :disabled="!shapeStore.selectedShapeLength" @click="shapeStore.deleteSelectedShape" />

        <v-divider vertical class="mx-3" color="#0A1A26"></v-divider>

        <MaterialIconButton v-for="alignItem in elementPositionAlign" :key="`align_${alignItem.name}`"
          :icon="alignItem.icon" variant="text" color="#0A1A26" :text="alignItem.text"
          :disabled="!shapeStore.selectedShapeLength" @click="setAlign(alignItem.name)" />
        <MaterialIconButton v-for="spaceItem in elementPositionSpace" :key="`space_${spaceItem.name}`"
          :icon="spaceItem.icon" variant="text" color="#0A1A26" :text="spaceItem.text"
          :disabled="shapeStore.selectedShapeLength < 3" @click="setSpacing(spaceItem.name)" />

        <v-divider vertical class="mx-3" color="#0A1A26"></v-divider>

        <MaterialIconButton v-for="layerItem in elementPositionLayer" :key="`layer_${layerItem.name}`"
          :icon="layerItem.icon" variant="text" color="#0A1A26" :text="layerItem.text"
          :disabled="shapeStore.selectedShapeLength !== 1 || layerStore.nodeLength <= 3"
          @click="setZIndex(layerItem.name)" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.editor-header {
  display: flex;
  align-items: center;
  height: 60px;
  background-color: rgb(var(--v-theme-cardBg));
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);

  &__logo {
    width: 60px;
    display: flex;
    justify-content: center;
  }

  &__element {
    display: flex;
    justify-content: space-between;
    width: calc(100% - 60px);
    padding: 0 10px;

    &>div {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  }

  &__element-attribute {
    width: 40%;

    .color-picker {
      i {
        font-size: 22px;
        width: 22px;
        height: 16px;
        margin-top: 2px;
      }
    }
  }
}
</style>
