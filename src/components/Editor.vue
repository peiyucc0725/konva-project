<script setup>
import Konva from 'konva'
import { v4 as uuidv4 } from 'uuid'
import ColorPicker from '@/components/ColorPicker.vue'
import MaterialIconButton from '@/components/MaterialIconButton.vue'
import { VNumberInput } from 'vuetify/labs/VNumberInput'
import logo from '@/assets/images/konva-logo_192x192.png'

const GUIDELINE_OFFSET = 5 // 對齊的距離範圍

const container = ref(null)
const stage = ref(null) // Konva 的舞台
const layer = ref(null) // Konva 的圖層
const transformer = ref(null)
const selectedShape = ref([])
const selectionRect = ref(null)
const mouseCurrentPos = ref({
  visible: false,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
})
const currentShapeType = ref(null)
const currentColor = ref('#000000')
const currentFontAttribute = ref({
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
})
const copyStyleSource = ref(null)
const keepCopyShape = ref(null)

const elementTools = reactive([
  { name: 'text', icon: 'mdi-format-text', text: 'Add Text' },
  { name: 'rectangle', icon: 'mdi-square-outline', text: 'Add Rectangle' },
  { name: 'circle', icon: 'mdi-circle-outline', text: 'Add Circle' },
])
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
    name: 'bold', icon: 'mdi-format-bold', text: 'Bold', variant: currentFontAttribute.value.bold ? 'tonal' : 'text',
  },
  {
    name: 'italic', icon: 'mdi-format-italic', text: 'Italic', variant: currentFontAttribute.value.italic ? 'tonal' : 'text',
  },
  {
    name: 'underline', icon: 'mdi-format-underline', text: 'Underline', variant: currentFontAttribute.value.underline ? 'tonal' : 'text',
  },
  {
    name: 'alignLeft', icon: 'mdi-format-align-left', text: 'Align Left', variant: currentFontAttribute.value.align === 'left' ? 'tonal' : 'text',
  },
  {
    name: 'alignCenter', icon: 'mdi-format-align-center', text: 'Align Center', variant: currentFontAttribute.value.align === 'center' ? 'tonal' : 'text',
  },
  {
    name: 'alignRight', icon: 'mdi-format-align-right', text: 'Align Right', variant: currentFontAttribute.value.align === 'right' ? 'tonal' : 'text',
  },
])

const nodeLength = computed(() => layer.value?.children.length)

// 計算可以對齊的參考線
const getLineGuideStops = () => {
  const vertical = [0, stage.value.width() / 2, stage.value.width()]
  const horizontal = [0, stage.value.height() / 2, stage.value.height()]
  const skipShape = selectedShape.value

  stage.value.find('.element').forEach((guideItem) => {
    const isSkipShape = skipShape.some((shape) => toRaw(shape) === toRaw(guideItem))
    if (isSkipShape) return

    const box = guideItem.getClientRect()
    vertical.push(box.x, box.x + box.width, box.x + box.width / 2)
    horizontal.push(box.y, box.y + box.height, box.y + box.height / 2)
  })

  return {
    vertical: vertical.flat(),
    horizontal: horizontal.flat(),
  }
}

// 計算物件邊緣對齊參考點
const getObjectSnappingEdges = () => {
  const box = transformer.value.findOne(".back").getClientRect()
  const { x, y } = stage.value.getAbsoluteTransform().copy().invert().point(box);
  box.x = x;
  box.y = y;

  const scale = stage.value.scaleX();
  box.height /= scale;
  box.width /= scale;

  const absPos = transformer.value.absolutePosition()

  return {
    vertical: [
      {
        guide: Math.round(box.x),
        offset: Math.round(absPos.x - box.x),
        snap: 'start',
      },
      {
        guide: Math.round(box.x + box.width / 2),
        offset: Math.round(absPos.x - box.x - box.width / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box.x + box.width),
        offset: Math.round(absPos.x - box.x - box.width),
        snap: 'end',
      },
    ],
    horizontal: [
      {
        guide: Math.round(box.y),
        offset: Math.round(absPos.y - box.y),
        snap: 'start',
      },
      {
        guide: Math.round(box.y + box.height / 2),
        offset: Math.round(absPos.y - box.y - box.height / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box.y + box.height),
        offset: Math.round(absPos.y - box.y - box.height),
        snap: 'end',
      },
    ],
  }
}

// 計算符合條件的輔助線
const getGuides = (lineGuideStops, itemBounds) => {
  const resultV = []
  const resultH = []

  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound) => {
      const diff = Math.abs(lineGuide - itemBound.guide)
      // 如果輔助線和物件對齊點的距離小於設定的偏移量，則判斷可以對齊
      if (diff < GUIDELINE_OFFSET) {
        resultV.push({
          lineGuide,
          diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        })
      }
    })
  })

  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound) => {
      const diff = Math.abs(lineGuide - itemBound.guide)
      if (diff < GUIDELINE_OFFSET) {
        resultH.push({
          lineGuide,
          diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        })
      }
    })
  })

  const guides = []

  // 找到最接近的對齊點
  const minV = resultV.sort((a, b) => a.diff - b.diff)[0]
  const minH = resultH.sort((a, b) => a.diff - b.diff)[0]
  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: 'V',
      snap: minV.snap,
    })
  }
  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: 'H',
      snap: minH.snap,
    })
  }
  return guides
}

// 繪製輔助線
const drawGuides = (guides) => {
  guides.forEach((lg) => {
    const line = new Konva.Line({
      points: lg.orientation === 'H' ? [-6000, 0, 6000, 0] : [0, -6000, 0, 6000],
      stroke: 'rgb(0, 161, 255)',
      strokeWidth: 1,
      name: 'guid-line',
      dash: [4, 6],
    })
    layer.value.add(line)
    line.absolutePosition({
      x: lg.orientation === 'H' ? 0 : lg.lineGuide,
      y: lg.orientation === 'H' ? lg.lineGuide : 0,
    })
  })
}

// 清除對齊輔助線
const clearGuidelines = () => {
  layer.value.find('.guid-line').forEach((line) => line.destroy())
}

// 處理矩形拖曳時的對齊
const handleDragMove = () => {
  const target = transformer.value
  const nodes = target.getNodes()
  if (!nodes) return
  // 清除現有輔助線
  clearGuidelines()

  // 獲取輔助線的基準點和目標邊界
  const lineGuideStops = getLineGuideStops()
  const itemBounds = getObjectSnappingEdges()
  // 計算輔助線
  const guides = getGuides(lineGuideStops, itemBounds)
  if (!guides.length) return

  // 繪製輔助線
  drawGuides(guides)
  const orgAbsPos = target.absolutePosition();
  const absPos = target.absolutePosition()
  // 強制物件位置
  guides.forEach((lg) => {
    absPos[lg.orientation === 'V' ? 'x' : 'y'] = lg.lineGuide + lg.offset
  })

  // gets the difference between the previous position and the new position
  const vecDiff = {
    x: orgAbsPos.x - absPos.x,
    y: orgAbsPos.y - absPos.y
  };

  // apply the difference to each shape in the transformer.
  nodes.forEach((n) => {
    const nodeAbsPos = n.getAbsolutePosition();

    const newPos = {
      x: nodeAbsPos.x - vecDiff.x,
      y: nodeAbsPos.y - vecDiff.y
    };

    n.setAbsolutePosition(newPos);
  });
}

const handleCopyStyle = (setAttrs) => {
  if (!selectedShape.value.length) return
  if (!copyStyleSource.value && !setAttrs) {
    copyStyleSource.value = JSON.parse(JSON.stringify(selectedShape.value[0].getAttrs()))
  } else if (copyStyleSource.value && setAttrs) {
    const excludeAttrs = ['elementId', 'x', 'y', 'offsetX', 'offsetY', 'radius']
    excludeAttrs.forEach((attr) => {
      delete copyStyleSource.value[attr]
    })

    selectedShape.value.forEach((target) => {
      target.setAttrs(copyStyleSource.value);
      const cloned = target.clone();
      target.destroy(); // 刪除舊的
      layer.value.add(cloned); // 加入新的
    })

    layer.value.batchDraw()
    copyStyleSource.value = null
    selectedShape.value = []
  } else {
    copyStyleSource.value = null
  }
}

const setFontAttribute = (type, value) => {
  if (selectedShape.value.length !== 1 || selectedShape.value[0].getClassName() !== 'Text') return
  switch (type) {
    case 'fontSize':
      currentFontAttribute.value.fontSize = value
      selectedShape.value[0].fontSize(value)
      break
    case 'bold': {
      currentFontAttribute.value.bold = value
      if (currentFontAttribute.value.italic && value) {
        selectedShape.value[0].fontStyle('italic bold')
      } else if (currentFontAttribute.value.italic && !value) {
        selectedShape.value[0].fontStyle('italic')
      } else if (value) {
        selectedShape.value[0].fontStyle('bold')
      } else {
        selectedShape.value[0].fontStyle('normal')
      }
      break
    }
    case 'italic':
      currentFontAttribute.value.italic = value
      if (currentFontAttribute.value.bold && value) {
        selectedShape.value[0].fontStyle('italic bold')
      } else if (currentFontAttribute.value.bold && !value) {
        selectedShape.value[0].fontStyle('bold')
      } else if (value) {
        selectedShape.value[0].fontStyle('italic')
      } else {
        selectedShape.value[0].fontStyle('normal')
      }
      break
    case 'underline':
      currentFontAttribute.value.underline = value
      selectedShape.value[0].textDecoration(value ? 'underline' : 'none')
      break
    case 'alignLeft':
      currentFontAttribute.value.align = 'left'
      selectedShape.value[0].align('left')
      break
    case 'alignCenter':
      currentFontAttribute.value.align = 'center'
      selectedShape.value[0].align('center')
      break
    case 'alignRight':
      currentFontAttribute.value.align = 'right'
      selectedShape.value[0].align('right')
      break
    default:
      break
  }
}

const updateSelectedColor = (color) => {
  if (selectedShape.value.length !== 1) return
  currentColor.value = color
  selectedShape.value[0].fill(color)
}

const setElementAttributeStatus = () => {
  if (selectedShape.value.length !== 1) return
  currentColor.value = selectedShape.value[0].fill()
  if (selectedShape.value[0].getClassName() === 'Text') {
    currentFontAttribute.value = {
      fontSize: Math.round(selectedShape.value[0].fontSize()),
      bold: selectedShape.value[0].fontStyle() === 'bold' || selectedShape.value[0].fontStyle() === 'italic bold',
      italic: selectedShape.value[0].fontStyle() === 'italic' || selectedShape.value[0].fontStyle() === 'italic bold',
      underline: selectedShape.value[0].textDecoration() === 'underline',
      align: selectedShape.value[0].align(),
    }
  }
}

const elementEvent = reactive({
  addRectangle: () => {
    const rectangle = new Konva.Rect({
      x: 100,
      y: 50,
      width: 100,
      height: 100,
      fill: Konva.Util.getRandomColor(),
      draggable: true,
      name: 'element',
      elementId: uuidv4(),
    })

    layer.value.add(rectangle)
    layer.value.batchDraw()
  },
  addCircle: () => {
    const circle = new Konva.Circle({
      x: 100,
      y: 50,
      width: 100,
      height: 100,
      offsetX: -50, // 因為圓形是從中心點開始，所以需要 offsetX 和 offsetY 來調整位置
      offsetY: -50,
      fill: Konva.Util.getRandomColor(),
      draggable: true,
      name: 'element',
      elementId: uuidv4(),
    })

    layer.value.add(circle)
    layer.value.batchDraw()
  },
  addText: () => {
    const text = new Konva.Text({
      x: 100,
      y: 50,
      width: 200,
      text: 'Hello Konva',
      fontSize: 28,
      draggable: true,
      name: 'element',
      fill: '#000000',
      padding: 5,
      elementId: uuidv4(),
    })

    layer.value.add(text)
    layer.value.batchDraw()

    text.on('transform', () => {
      const activeAnchor = transformer.value.getActiveAnchor()
      if (activeAnchor.includes('middle')) {
        text.setAttrs({
          width: Math.max(text.width() * text.scaleX(), 50),
          fontSize: text.fontSize(),
          scaleX: 1,
          scaleY: 1,
        })
      } else {
        text.setAttrs({
          width: text.width() * text.scaleX(),
          fontSize: text.fontSize() * text.scaleX(),
          scaleX: 1,
          scaleY: 1,
        })
      }
      layer.value.batchDraw()
    })
    text.on('transformend', () => {
      setFontAttribute('fontSize', Math.round(text.fontSize()))
    })
    text.on('dblclick', (e) => {
      const target = e.target
      target.hide()

      const textPosition = target.absolutePosition()
      const areaPosition = {
        x: stage.value.container().offsetLeft + textPosition.x,
        y: stage.value.container().offsetTop + textPosition.y,
      }
      const textarea = document.createElement('textarea')
      container.value.appendChild(textarea)
      textarea.value = target.text()
      textarea.style.top = `${areaPosition.y}px`
      textarea.style.left = `${areaPosition.x}px`
      textarea.style.width = `${target.width() * target.scaleX()}px`
      textarea.style.height = `${target.height() * target.scaleY()}px`
      textarea.style.padding = `${target.padding()}px`
      textarea.style.fontSize = `${target.fontSize() * target.scaleX()}px`
      textarea.style.lineHeight = target.lineHeight()
      textarea.style.fontFamily = target.fontFamily()
      textarea.style.textAlign = target.align()
      textarea.style.color = target.fill()
      textarea.style.fontWeight = target.fontStyle().includes('bold') ? 'bold' : 'normal'
      textarea.style.fontStyle = target.fontStyle().includes('italic') ? 'italic' : 'normal'
      textarea.style.textDecoration = target.textDecoration()
      const rotation = target.rotation()
      let transform = ''
      if (rotation) {
        transform += `rotateZ(${rotation}deg)`
      }

      let translateY = 0
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1
      if (isFirefox) {
        translateY += 2 + Math.round(target.fontSize() / 20)
      }
      transform += `translateY(-${translateY}px)`

      textarea.style.transform = transform

      textarea.focus()

      const removeTextarea = () => {
        textarea.parentNode.removeChild(textarea)

        window.removeEventListener('click', handleOutsideClick)
        target.show()
      }

      const handleOutsideClick = (e) => {
        if (e.target !== textarea) {
          target.text(textarea.value)
          removeTextarea()
        }
      }

      const setTextareaWidth = (textWidth) => {
        let newWidth = textWidth
        if (!newWidth) {
          // 如果沒有設定寬度，則使用 placeholder 的長度乘以字體大小
          newWidth = target.placeholder.length * target.fontSize()
        }
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        )
        if (isSafari || isFirefox) {
          newWidth = Math.ceil(newWidth)
        }

        const isEdge = document.documentMode || /Edge/.test(navigator.userAgent)
        if (isEdge) {
          newWidth += 1
        }
        textarea.style.width = `${newWidth}px`
      }

      textarea.addEventListener('keydown', (e) => {
        if (e.keyCode === 13 && !e.shiftKey) {
          target.text(textarea.value)
          removeTextarea()
        }
        if (e.keyCode === 27) {
          removeTextarea()
        }

        const scale = target.getAbsoluteScale().x
        setTextareaWidth(target.width() * scale)
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight + target.fontSize()}px`
      })

      setTimeout(() => {
        window.addEventListener('click', handleOutsideClick)
      })
    })
  },
})

const setAlign = (alignType) => {
  if (!selectedShape.value.length) return
  const minX = Math.min(...selectedShape.value.map((item) => item.absolutePosition().x))
  const maxX = Math.max(...selectedShape.value.map((item) => item.absolutePosition().x + item.width() * item.scaleX()))
  const minY = Math.min(...selectedShape.value.map((item) => item.absolutePosition().y))
  const maxY = Math.max(...selectedShape.value.map((item) => item.absolutePosition().y + item.height() * item.scaleY()))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  if (selectedShape.value.length > 1) {
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
  if (!selectedShape.value.length) return
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
  const max = selectedShape.value[selectedShape.value.length - 1].absolutePosition()[type.pos] + selectedShape.value[selectedShape.value.length - 1][type.size]() * selectedShape.value[selectedShape.value.length - 1][type.scale]()
  const totalShape = selectedShape.value.reduce((n, item) => n + item[type.size]() * item[type.scale](), 0)
  const spacingDiff = (max - min - totalShape) / (selectedShape.value.length - 1)
  selectedShape.value.forEach((shape, index) => {
    if (shape.absolutePosition()[type.pos] === min || shape.absolutePosition()[type.pos] + shape[type.size]() * shape[type.scale]() === max) return
    const absPos = shape.absolutePosition()
    absPos[type.pos] = selectedShape.value[index - 1].absolutePosition()[type.pos] + selectedShape.value[index - 1][type.size]() * selectedShape.value[index - 1][type.scale]() + spacingDiff
    shape.absolutePosition(absPos)
  })
}

const setZIndex = (zIndexType) => {
  if (!selectedShape.value.length) return
  const zIndex = selectedShape.value[0].zIndex()
  const topZIndex = nodeLength.value - 3
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

const handleCopyShape = () => {
  if (!selectedShape.value.length) {
    keepCopyShape.value = []
  } else {
    keepCopyShape.value = selectedShape.value.map((shape) => shape.clone())
  }
}

const handlePasteShape = (shapes) => {
  let sourceShapes = shapes || selectedShape.value
  if (!sourceShapes.length) return
  let newSelectedShape = []
  sourceShapes.forEach((shape) => {
    const copyShape = shape.clone()
    copyShape.elementId = uuidv4()
    copyShape.x(copyShape.x() + 50)
    copyShape.y(copyShape.y() + 50)
    layer.value.add(copyShape)
    newSelectedShape.push(copyShape)
  })
  selectedShape.value = newSelectedShape
  layer.value.batchDraw()

  if (shapes) {
    handleCopyShape()
  }
}

const handleDeleteShape = () => {
  selectedShape.value.forEach((shape) => {
    shape.remove()
  })
  selectedShape.value = []
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
  selectedShape.value = elements
  setElementAttributeStatus()
  handleCopyStyle(true)
}

// 處理滑鼠按下
const handleStageMouseDown = (e) => {
  if (e.target.getClassName() === 'Stage') {
    selectedShape.value = []
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
    selectedShape.value = nodes
  } else if (metaPressed && !isSelected) {
    const nodes = transformer.value.nodes().concat([e.target])
    selectedShape.value = nodes
  } else if (metaPressed || !isSelected) {
    selectedShape.value = [e.target]
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
  selectionRect.value.zIndex(nodeLength.value - 1)
  layer.value.batchDraw()
}

// 更新 Transformer
const updateTransformer = () => {
  if (selectedShape.value.length) {
    transformer.value.nodes(selectedShape.value)
  } else {
    transformer.value.nodes([])
    layer.value.batchDraw()
    return
  }
  const keepRatioEnabledAnchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  const textEnabledAnchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']
  const defaultEnabledAnchors = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'middle-left', 'middle-right']
  transformer.value.zIndex(nodeLength.value - 1)
  if (selectedShape.value.length > 1) {
    transformer.value.enabledAnchors(keepRatioEnabledAnchors)
  } else if (selectedShape.value[0].getClassName() === 'Text') {
    transformer.value.enabledAnchors(textEnabledAnchors)
  } else {
    transformer.value.enabledAnchors(defaultEnabledAnchors)
  }
  selectionRect.value.zIndex(nodeLength.value - 1)
  layer.value.batchDraw()
}

const handleKeydownListener = (e) => {
  if (selectedShape.value.length) {
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
        handleDeleteShape()
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
        handleCopyShape()
      }
      break
    case 'v':
      if (e.ctrlKey || e.metaKey) {
        handlePasteShape(keepCopyShape.value)
      }
      break
    default:
      break;
  }
}

// 初始化 Konva 舞台與圖層
const initializeStage = () => {
  const width = window.innerWidth - container.value.offsetLeft
  const height = window.innerHeight - container.value.offsetTop

  stage.value = new Konva.Stage({
    container: container.value,
    width,
    height,
  })

  // 建立 Transformer
  transformer.value = new Konva.Transformer({
    rotateEnabled: false, // 禁用旋轉
    flipEnabled: false,
    keepRatio: true,
    borderStrokeWidth: 2,
    anchorStrokeWidth: 2,
    anchorSize: 12,
  })

  const infoText = new Konva.Label({
    name: 'info-text',
    visible: false,
  })

  infoText.add(new Konva.Tag({
    fill: 'rgba(0, 161, 255)',
    pointerDirection: 'none',
    cornerRadius: 5,
  }))

  infoText.add(new Konva.Text({
    fontSize: 12,
    fill: '#ffffff',
    padding: 5,
  }))

  transformer.value.add(infoText)

  selectionRect.value = new Konva.Rect({
    fill: 'rgba(0, 161, 255, 0.3)',
    name: 'selection-rect',
    visible: false,
  })

  layer.value = new Konva.Layer()
  stage.value.add(layer.value)
  layer.value.add(transformer.value)
  layer.value.add(selectionRect.value)
  layer.value.draw()

  stage.value.on('mousedown', (e) => {
    handleStageMouseDown(e)
  })
  stage.value.on('mousemove', (e) => {
    handleStageMouseMove(e)
  })
  stage.value.on('mouseup', (e) => {
    handleStageMouseUp(e)
  })

  stage.value.on('dragmove', handleDragMove)
  stage.value.on('dragend', clearGuidelines)

  transformer.value.on('transform', (e) => {
    infoText.visible(true)
    const { width, height } = transformer.value.findOne(".back").getClientRect()
    infoText.getText().text(`${Math.round(width)} x ${Math.round(height)}`)
    infoText.offsetX(-(width / 2 - infoText.width() / 2))
    infoText.offsetY(-height - 20)
  })
  transformer.value.on('transformend', () => {
    infoText.visible(false)
  })
}

watch(() => selectedShape.value, () => {
  if (selectedShape.value.length === 1) {
    currentShapeType.value = selectedShape.value[0].getClassName()
  } else if (selectedShape.value.length > 1) {
    currentShapeType.value = 'group'
  } else {
    currentShapeType.value = null
  }
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
  <div class="board">
    <div class="board-header">
      <div class="board-header__logo">
        <VAvatar :image="logo" rounded="0" size="32" />
      </div>
      <div class="board-header__element">
        <div class="board-header__element-attribute">
          <template v-if="selectedShape.length === 1">
            <VNumberInput v-if="currentShapeType === 'Text'" v-model:model-value="currentFontAttribute.fontSize"
              :min="1" :max="1000" :step="1" max-width="100" control-variant="stacked" variant="outlined"
              density="compact" single-line flat hide-details
              @update:model-value="setFontAttribute('fontSize', $event)" />
            <ColorPicker v-model="currentColor" @update:modelValue="updateSelectedColor">
              <template #button="{ props }">
                <v-btn v-bind="props" size="36" variant="text" rounded icon>
                  <div class="d-flex flex-column align-center justify-center">
                    <v-icon>{{ currentShapeType === 'Text' ? 'mdi-format-color-text' : 'mdi-format-color-fill'
                      }}</v-icon>
                    <v-sheet :color="currentColor" height="4" width="20" tile />
                  </div>
                </v-btn>
              </template>
            </ColorPicker>
            <template v-if="currentShapeType === 'Text'">
              <MaterialIconButton v-for="fontAttribute in elementFontAttribute" :key="fontAttribute.name"
                :icon="fontAttribute.icon" :variant="fontAttribute.variant" color="#0A1A26" :text="fontAttribute.text"
                @click="setFontAttribute(fontAttribute.name, !currentFontAttribute[fontAttribute.name])" />
            </template>
            <MaterialIconButton icon="mdi-format-paint" :variant="copyStyleSource ? 'tonal' : 'text'" color="#0A1A26"
              text="Copy Style" :disabled="!selectedShape.length" @click="handleCopyStyle(false)" />
          </template>
        </div>
        <div class="board-header__element-position">
          <MaterialIconButton icon="fa:far fa-copy" variant="text" color="#0A1A26" text="Copy"
            :disabled="!selectedShape.length" @click="handlePasteShape(null)" />
          <MaterialIconButton icon="fa:far fa-trash-can" variant="text" color="#0A1A26" text="Delete"
            :disabled="!selectedShape.length" @click="handleDeleteShape" />

          <v-divider vertical class="mx-3" color="#0A1A26"></v-divider>

          <MaterialIconButton v-for="alignItem in elementPositionAlign" :key="`align_${alignItem.name}`"
            :icon="alignItem.icon" variant="text" color="#0A1A26" :text="alignItem.text"
            :disabled="!selectedShape.length" @click="setAlign(alignItem.name)" />
          <MaterialIconButton v-for="spaceItem in elementPositionSpace" :key="`space_${spaceItem.name}`"
            :icon="spaceItem.icon" variant="text" color="#0A1A26" :text="spaceItem.text"
            :disabled="selectedShape.length < 3" @click="setSpacing(spaceItem.name)" />

          <v-divider vertical class="mx-3" color="#0A1A26"></v-divider>

          <MaterialIconButton v-for="layerItem in elementPositionLayer" :key="`layer_${layerItem.name}`"
            :icon="layerItem.icon" variant="text" color="#0A1A26" :text="layerItem.text"
            :disabled="selectedShape.length !== 1 || nodeLength <= 3" @click="setZIndex(layerItem.name)" />
        </div>
      </div>
    </div>

    <div class="board-body">
      <div class="board-body__element-type">
        <MaterialIconButton v-for="element in elementTools" :key="element.name" :icon="element.icon" variant="text"
          color="#0A1A26" :text="element.text" location="right"
          @click="elementEvent[`add${element.name[0].toUpperCase() + element.name.slice(1)}`]" />
      </div>
      <div class="board-body__container" id="container" ref="container" />
    </div>
  </div>
</template>
<style lang="scss">
.board {
  .board-header {
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

  .board-body {
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
