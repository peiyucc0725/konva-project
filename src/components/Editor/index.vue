<script setup>
import Konva from 'konva'
import MaterialIconButton from '@/components/MaterialIconButton.vue'
import EditorHeader from './components/EditorHeader.vue'
import { useStageStore } from '@/stores/konva/stage'
import { useLayerStore } from '@/stores/konva/layer'
import { useShapeStore } from '@/stores/konva/shape'
import { useTransformerStore } from '@/stores/konva/transformer'
import { useElementStore } from '@/stores/konva/element'

const stageStore = useStageStore()
const layerStore = useLayerStore()
const shapeStore = useShapeStore()
const transformerStore = useTransformerStore()
const elementStore = useElementStore()

const container = ref(null)
const selectionRect = ref(null)
const mouseCurrentPos = ref({
  visible: false,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
})
const copyStyleSource = ref(null)

const elementTools = reactive([
  { name: 'text', icon: 'mdi-format-text', text: 'Add Text', event: 'addText' },
  { name: 'rectangle', icon: 'mdi-square-outline', text: 'Add Rectangle', event: 'addRectangle' },
  { name: 'circle', icon: 'mdi-circle-outline', text: 'Add Circle', event: 'addCircle' },
])

const stage = computed(() => stageStore.stage)
const layer = computed(() => layerStore.layer)
const selectedShape = computed(() => shapeStore.selectedShape)
const transformer = computed(() => transformerStore.transformer)

const handleCopyStyle = (setAttrs) => {
  if (!shapeStore.selectedShapeLength) return
  if (!copyStyleSource.value && !setAttrs) {
    copyStyleSource.value = selectedShape.value[0].clone()
  } else if (copyStyleSource.value && setAttrs) {
    const sourceAttrs = copyStyleSource.value.getAttrs()
    const excludeAttrs = ['elementId', 'x', 'y', 'offsetX', 'offsetY', 'radius']
    excludeAttrs.forEach((attr) => {
      delete sourceAttrs[attr]
    })

    selectedShape.value.forEach((target) => {
      if ((copyStyleSource.value.getClassName() === 'Text' && target.getClassName() !== 'Text')
        || (copyStyleSource.value.getClassName() !== 'Text' && target.getClassName() === 'Text')) {
        target.setAttrs({
          ...sourceAttrs,
          width: target.width(),
          height: target.height(),
          scaleX: target.scaleX(),
          scaleY: target.scaleY(),
        });
      } else {
        target.setAttrs(sourceAttrs);
      }
      const cloned = target.clone();
      target.destroy(); // 刪除舊的
      layerStore.addShapeIntoLayer(cloned); // 加入新的
    })

    layer.value.batchDraw()
    copyStyleSource.value = null
    shapeStore.setSelectedShape([])
  } else {
    copyStyleSource.value = null
  }
}

const setElementAttributeStatus = () => {
  if (shapeStore.selectedShapeLength !== 1) return
  shapeStore.setCurrentColor(selectedShape.value[0].fill())
  if (selectedShape.value[0].getClassName() === 'Text') {
    shapeStore.setCurrentFontAttribute({
      fontSize: Math.round(selectedShape.value[0].fontSize()),
      bold: selectedShape.value[0].fontStyle() === 'bold' || selectedShape.value[0].fontStyle() === 'italic bold',
      italic: selectedShape.value[0].fontStyle() === 'italic' || selectedShape.value[0].fontStyle() === 'italic bold',
      underline: selectedShape.value[0].textDecoration() === 'underline',
      align: selectedShape.value[0].align(),
    })
  }
}

const elementEvent = (eventType) => {
  switch (eventType) {
    case 'addRectangle':
      elementStore.addRectangle()
      break
    case 'addCircle':
      elementStore.addCircle()
      break
    case 'addText':
      elementStore.addText()
      break
  }
}

// 處理滑鼠移動
const handleStageMouseMove = (e) => {
  if (!mouseCurrentPos.value.visible) return
  const pos = e.target.getStage().getPointerPosition()
  mouseCurrentPos.value.x2 = pos.x
  mouseCurrentPos.value.y2 = pos.y
}

// 處理滑鼠放開
const handleStageMouseUp = () => {
  if (!mouseCurrentPos.value.visible) return
  mouseCurrentPos.value.visible = false
  const selBox = selectionRect.value.getClientRect()
  const elements = []
  layer.value.find('.element').forEach((elementNode) => {
    const elBox = elementNode.getClientRect()
    if (Konva.Util.haveIntersection(selBox, elBox)) {
      elements.push(elementNode)
    }
  })
  shapeStore.setSelectedShape(elements)
  setElementAttributeStatus()
  handleCopyStyle(true)
}

// 處理滑鼠按下
const handleStageMouseDown = (e) => {
  if (e.target.getClassName() === 'Stage') {
    shapeStore.setSelectedShape([])
    const pos = e.target.getStage().getPointerPosition()
    mouseCurrentPos.value = {
      visible: true,
      x1: pos.x,
      y1: pos.y,
      x2: pos.x,
      y2: pos.y,
    }
    return
  }

  const isTransformer = e.target.getParent()?.className === 'Transformer'
  const isSelected = transformer.value.nodes().find((node) => toRaw(node) === toRaw(e.target))
  const isElement = e.target.getParent()?.getChildren().find((node) => node.hasName('element'))
  if (isTransformer || !isElement) return

  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
  if (metaPressed && isSelected) {
    // 使用 slice 來複製陣列
    const nodes = transformer.value.nodes().slice()
    nodes.splice(nodes.indexOf(reactive(e.target)), 1)
    shapeStore.setSelectedShape(nodes)
  } else if (metaPressed && !isSelected) {
    const nodes = transformer.value.nodes().concat([e.target])
    shapeStore.setSelectedShape(nodes)
  } else if (metaPressed || !isSelected) {
    shapeStore.setSelectedShape([e.target])
  }
  setElementAttributeStatus()
  handleCopyStyle(true)
}

// 更新選擇矩形
const updateSelectionRect = () => {
  if (!selectionRect.value) return
  const {
    visible, x1, y1, x2, y2,
  } = mouseCurrentPos.value
  selectionRect.value.setAttrs({
    visible,
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x1 - x2),
    height: Math.abs(y1 - y2),
  })
  selectionRect.value.zIndex(layerStore.nodeLength - 1)
  layer.value.batchDraw()
}

// 更新 Transformer
const updateTransformer = () => {
  if (shapeStore.selectedShapeLength) {
    transformer.value.nodes(selectedShape.value)
  } else {
    transformer.value.nodes([])
    layer.value.batchDraw()
    return
  }
  const keepRatioEnabledAnchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  const textEnabledAnchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']
  const defaultEnabledAnchors = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'middle-left', 'middle-right']
  transformer.value.zIndex(layerStore.nodeLength - 1)
  if (shapeStore.selectedShapeLength > 1) {
    transformer.value.enabledAnchors(keepRatioEnabledAnchors)
  } else if (selectedShape.value[0].getClassName() === 'Text') {
    transformer.value.enabledAnchors(textEnabledAnchors)
  } else {
    transformer.value.enabledAnchors(defaultEnabledAnchors)
  }
  selectionRect.value.zIndex(layerStore.nodeLength - 1)
  layer.value.batchDraw()
}

const handleKeydownListener = (e) => {
  if (shapeStore.selectedShapeLength) {
    const moveDistance = e.shiftKey ? 5 : 1
    const moveShape = (pos, distance) => {
      selectedShape.value.forEach((shape) => {
        const absPos = shape.absolutePosition()
        absPos[pos] += distance
        shape.absolutePosition(absPos)
      })
    }

    switch (e.key) {
      case 'Delete':
        shapeStore.deleteSelectedShape()
        break
      case 'ArrowUp':
        moveShape('y', -moveDistance)
        break
      case 'ArrowDown':
        moveShape('y', moveDistance)
        break
      case 'ArrowLeft':
        moveShape('x', -moveDistance)
        break
      case 'ArrowRight':
        moveShape('x', moveDistance)
        break
      default:
        break
    }
  }
  switch (e.key) {
    case 'c':
      if (e.ctrlKey || e.metaKey) {
        shapeStore.copyShape()
      }
      break
    case 'v':
      if (e.ctrlKey || e.metaKey) {
        shapeStore.pasteShape(shapeStore.keepCopyShape)
      }
      break
    default:
      break;
  }
}

// 初始化 Konva 舞台與圖層
const initializeStage = () => {
  stageStore.createStage(container.value)

  // 建立 Transformer
  transformerStore.createTransformer()

  selectionRect.value = new Konva.Rect({
    fill: 'rgba(0, 161, 255, 0.3)',
    name: 'selection-rect',
    visible: false,
  })

  layerStore.setLayer(new Konva.Layer())
  stageStore.addLayerIntoStage(layer.value)
  layerStore.addShapeIntoLayer(transformer.value)
  layerStore.addShapeIntoLayer(selectionRect.value)
  layer.value.draw()

  stage.value.on('mousedown', handleStageMouseDown)
  stage.value.on('mousemove', handleStageMouseMove)
  stage.value.on('mouseup', handleStageMouseUp)
}

watch(() => selectedShape.value, () => {
  updateTransformer()
})

watch(() => mouseCurrentPos.value, () => {
  updateSelectionRect()
}, { deep: true })

onMounted(() => {
  initializeStage()
  document.addEventListener('keydown', handleKeydownListener)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydownListener)
})
</script>
<template>
  <div class="editor">
    <EditorHeader :copyStyleSource="copyStyleSource" @handleCopyStyle="handleCopyStyle" />
    <div class="editor-body">
      <div class="editor-body__element-type">
        <MaterialIconButton v-for="element in elementTools" :key="element.name" :icon="element.icon" variant="text"
          color="#0A1A26" :text="element.text" location="right" @click="elementEvent(element.event)" />
      </div>
      <div class="editor-body__container" id="container" ref="container" />
    </div>
  </div>
</template>
<style lang="scss">
.editor {
  textarea {
    position: absolute;
    border: none;
    margin: 0px;
    overflow: hidden;
    background: none;
    outline: none;
    resize: none;
    transform-origin: left top;
  }
}
</style>
<style lang="scss" scoped>
.editor {
  .editor-body {
    height: calc(100vh - 60px);
    display: flex;

    &__element-type {
      width: 60px;
      height: 100%;
      background: rgb(var(--v-theme-cardBg));
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      gap: 5px;
    }

    &__container {
      width: calc(100% - 60px);
      height: 100%;
      background: #f0f0f0;
    }
  }
}
</style>
