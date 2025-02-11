<script setup>
const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'primary',
  },
  size: {
    type: [Number, String],
    default: 36,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'elevated',
  },
  location: {
    type: String,
    default: 'bottom',
  },
})
</script>
<template>
  <v-tooltip :location="location" :text="text" open-delay="300">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" class="material-icon-btn" rounded="lg" elevation="0" :color="color" :disabled="disabled"
        :variant="variant" :style="{ width: `${size}px !important`, height: `${size}px !important` }" :icon="icon"
        @click.stop="$emit('click', $event)">
      </v-btn>
    </template>
  </v-tooltip>
</template>
<style lang="scss"></style>
