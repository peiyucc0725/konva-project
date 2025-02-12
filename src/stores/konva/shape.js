import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { useLayerStore } from './layer'

export const useShapeStore = defineStore('shape', () => {
  const layerStore = useLayerStore()

  const selectedShape = ref([])
  const keepCopyShape = ref([])
  const currentColor = ref('#000000')
  const currentFontAttribute = ref({
    fontSize: 14,
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
  })

  const selectedShapeLength = computed(() => selectedShape.value.length)

  const currentShapeType = computed(() => {
    if (selectedShapeLength.value === 1) {
      return selectedShape.value[0].getClassName()
    } else if (selectedShapeLength.value > 1) {
      return 'group'
    }
    return null
  })

  const setSelectedShape = (val) => {
    selectedShape.value = val
  }

  const setCurrentColor = (val) => {
    currentColor.value = val
  }

  const setCurrentFontAttribute = (val) => {
    currentFontAttribute.value = val
  }

  const setFontAttribute = (type, value) => {
    if (selectedShapeLength.value !== 1 || selectedShape.value[0].getClassName() !== 'Text') return
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

  const deleteSelectedShape = () => {
    selectedShape.value.forEach((shape) => {
      shape.remove()
    })
    selectedShape.value = []
  }

  const copyShape = () => {
    if (!selectedShapeLength.value) {
      keepCopyShape.value = []
    } else {
      keepCopyShape.value = selectedShape.value.map((shape) => shape.clone())
    }
  }

  const pasteShape = (shapes) => {
    let sourceShapes = shapes || selectedShape.value
    if (!sourceShapes.length) return
    let newSelectedShape = []
    sourceShapes.forEach((shape) => {
      const copyShape = shape.clone()
      copyShape.elementId = uuidv4()
      copyShape.x(copyShape.x() + 50)
      copyShape.y(copyShape.y() + 50)
      layerStore.addShapeIntoLayer(copyShape)
      newSelectedShape.push(copyShape)
    })
    setSelectedShape(newSelectedShape)
    layerStore.layer.batchDraw()

    if (shapes) {
      copyShape()
    }
  }

  return {
    selectedShape,
    setSelectedShape,
    currentShapeType,
    currentColor,
    setCurrentColor,
    currentFontAttribute,
    setCurrentFontAttribute,
    setFontAttribute,
    selectedShapeLength,
    deleteSelectedShape,
    keepCopyShape,
    copyShape,
    pasteShape,
  }
})
