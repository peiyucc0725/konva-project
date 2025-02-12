import { defineStore } from 'pinia'

export const useTransformerStore = defineStore('transformer', () => {
  const transformer = ref(null)

  const setTransformer = (val) => {
    transformer.value = val
  }

  const createTransformer = () => {
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

  return { transformer, setTransformer, createTransformer }
})
