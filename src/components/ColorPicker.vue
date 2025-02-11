<script setup>
const emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: String,
  label: String,
  labelSize: {
    type: Number,
    default: 14,
  },
  labelDist: {
    type: Number,
    default: 10,
  },
})

const currentColor = ref('#000000')
const swatches = reactive([
  ['#EF4444', '#F97316', '#FACC15'],
  ['#4ADE80', '#2DD4BF', '#3B82F6'],
  ['#6366F1', '#EC4899', '#F43F5E'],
  ['#D946EF', '#8B5CF6', '#0EA5E9'],
  ['#10B981', '#84CC16', '#000055'],
])

const handleUpdateChangeModelValue = (val) => {
  emit('update:modelValue', val)
}

watch(() => props.modelValue, (val) => {
  currentColor.value = val
}, { immediate: true })
</script>
<template>
  <div class="color-picker">
    <div v-if="label" class="color-picker__label"
      :style="{ 'font-size': `${labelSize}px`, 'margin-bottom': `${labelDist}px` }">{{ label }}</div>
    <v-menu content-class="color-picker" :close-on-content-click="false">
      <template v-slot:activator="{ props }">
        <slot name="button" :props="props">
          <v-btn v-bind="props" :color="currentColor" size="x-small" variant="flat" icon></v-btn>
        </slot>
      </template>
      <v-color-picker v-model="currentColor" :swatches="swatches" :width="240" show-swatches
        @update:modelValue="handleUpdateChangeModelValue"></v-color-picker>
    </v-menu>
  </div>
</template>

<style lang="scss">
.color-picker {
  display: flex;
  flex-direction: column;
  align-items: center;

  &__label {
    color: rgb(var(--v-theme-mainText));
    line-height: 14px;
  }

  .v-color-picker {
    overflow: hidden auto !important;
    border-radius: 10px !important;

    .v-color-picker-canvas {
      margin: 12px 12px 0 12px;
    }

    .v-color-picker__controls {
      padding: 10px 12px 0 12px;

      .v-color-picker-preview {
        margin-bottom: 14px;

        .v-color-picker-preview__track {
          width: 95%;

          .v-input__control {
            min-height: 24px;
          }
        }
      }

      .v-color-picker-edit__input {
        input {
          background: rgb(var(--v-theme-cardBg));
          border: 1px solid;
          font-size: 12px;
          height: 24px;
          margin-bottom: 4px;
        }
      }
    }

    .v-color-picker-swatches__swatch {
      margin-bottom: 4px;

      .v-color-picker-swatches__color {
        width: 36px;
        border-radius: 999px;
      }
    }
  }
}
</style>
