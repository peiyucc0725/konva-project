import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { useLayerStore } from './layer'
import { useShapeStore } from './shape'
import { useStageStore } from './stage'
import { useTransformerStore } from './transformer'

export const useElementStore = defineStore('element', () => {
  const layerStore = useLayerStore()
  const shapeStore = useShapeStore()
  const stageStore = useStageStore()
  const transformerStore = useTransformerStore()

  const addRectangle = () => {
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

    layerStore.addShapeIntoLayer(rectangle)
    layerStore.layer.batchDraw()
  }

  const addCircle = () => {
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

    layerStore.addShapeIntoLayer(circle)
    layerStore.layer.batchDraw()
  }

  const addText = () => {
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

    layerStore.addShapeIntoLayer(text)
    layerStore.layer.batchDraw()

    text.on('transform', () => {
      const activeAnchor = transformerStore.transformer.getActiveAnchor()
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
      layerStore.layer.batchDraw()
    })
    text.on('transformend', () => {
      shapeStore.setFontAttribute('fontSize', Math.round(text.fontSize()))
    })
    text.on('dblclick', (e) => {
      const target = e.target
      target.hide()

      const textPosition = target.absolutePosition()
      const areaPosition = {
        x: stageStore.stage.container().offsetLeft + textPosition.x,
        y: stageStore.stage.container().offsetTop + textPosition.y,
      }

      const textarea = document.createElement('textarea')
      stageStore.containerRef.appendChild(textarea)
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
  }

  return { addRectangle, addCircle, addText }
})
