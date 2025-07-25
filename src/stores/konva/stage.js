import { defineStore } from 'pinia'
import { useLayerStore } from './layer'
import { useShapeStore } from './shape'
import { useTransformerStore } from './transformer'

export const useStageStore = defineStore('stage', () => {
  const GUIDELINE_OFFSET = 5 // 對齊的距離範圍

  const layerStore = useLayerStore()
  const shapeStore = useShapeStore()
  const transformerStore = useTransformerStore()

  const stage = ref(null)
  const containerRef = ref(null)

  const setStage = (val) => {
    stage.value = val
  }

  const createStage = (container) => {
    containerRef.value = container
    stage.value = new Konva.Stage({
      container: container,
      width: window.innerWidth - container.offsetLeft,
      height: window.innerHeight - container.offsetTop,
    })

    stage.value.on('dragmove', handleDragMove)
    stage.value.on('dragend', clearGuidelines)
  }

  const addLayerIntoStage = (layer) => {
    stage.value.add(layer)
  }

  // 計算可以對齊的參考線
  const getLineGuideStops = () => {
    const vertical = [0, stage.value.width() / 2, stage.value.width()]
    const horizontal = [0, stage.value.height() / 2, stage.value.height()]
    const skipShape = shapeStore.selectedShape

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
    const box = transformerStore.transformer.findOne(".back").getClientRect()
    const { x, y } = stage.value.getAbsoluteTransform().copy().invert().point(box);
    box.x = x;
    box.y = y;

    const scale = stage.value.scaleX();
    box.height /= scale;
    box.width /= scale;

    const absPos = transformerStore.transformer.absolutePosition()

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
      layerStore.addShapeIntoLayer(line)
      line.absolutePosition({
        x: lg.orientation === 'H' ? 0 : lg.lineGuide,
        y: lg.orientation === 'H' ? lg.lineGuide : 0,
      })
    })
  }

  // 清除對齊輔助線
  const clearGuidelines = () => {
    layerStore.layer.find('.guid-line').forEach((line) => line.destroy())
  }

  // 處理矩形拖曳時的對齊
  const handleDragMove = () => {
    const target = transformerStore.transformer
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

    // 計算前後位置的差值
    const vecDiff = {
      x: orgAbsPos.x - absPos.x,
      y: orgAbsPos.y - absPos.y
    };

    // 將差值應用到每個形狀
    nodes.forEach((n) => {
      const nodeAbsPos = n.getAbsolutePosition();

      const newPos = {
        x: nodeAbsPos.x - vecDiff.x,
        y: nodeAbsPos.y - vecDiff.y
      };

      n.setAbsolutePosition(newPos);
    });
  }


  return { stage, containerRef, setStage, addLayerIntoStage, createStage }
})
