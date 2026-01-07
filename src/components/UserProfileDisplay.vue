<script setup>
import { computed, ref, onBeforeUnmount } from 'vue';
import { getVolunteerColor } from '@/helpers/color-utils';

const props = defineProps({
  volunteer: Object,
  showEmail: Boolean,
  showName: Boolean,
  disableTooltip: Boolean
});

const isTooltipVisible = ref(false);
const isHovering = ref(false);
let tooltipTimeout = null;

const showTooltip = () => {
  if (props.disableTooltip) return;
  isTooltipVisible.value = true;
  if (tooltipTimeout) clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => {
    if (!isHovering.value) {
      isTooltipVisible.value = false;
    }
  }, 3000);
};

const handleMouseEnter = () => {
  if (props.disableTooltip) return;
  isHovering.value = true;
};

const handleMouseLeave = () => {
  if (props.disableTooltip) return;
  isHovering.value = false;
  if (tooltipTimeout) clearTimeout(tooltipTimeout);
  isTooltipVisible.value = false;
};

// Cleanup on component unmount
onBeforeUnmount(() => {
  if (tooltipTimeout) clearTimeout(tooltipTimeout);
});

const generateInitials = (user) => {
  if (!user?.username) return '??';
  const name = user.username.split(' ');
  return name.length > 1 
    ? (name[0].charAt(0) + name[name.length-1].charAt(0)).toUpperCase()
    : name[0].charAt(0).toUpperCase();
}

const fullName = computed(() => {
  return props.volunteer?.username || 'Unknown User';
});

const userBubbleColor = computed(() => {
  return getVolunteerColor(props.volunteer);
});
</script>

<template>
  <div class="flex flex-wrap items-center justify-start">
    <div 
      class="group relative isolate"
      @mouseleave="handleMouseLeave"
      @mouseenter="handleMouseEnter"
    >
      <div 
        :class="`bg-${userBubbleColor}-500`"
        class="h-10 w-10 rounded-full flex items-center justify-center cursor-pointer relative z-10"
        @click="showTooltip"
      >
        <span class="text-white font-bold uppercase">{{ generateInitials(props.volunteer) }}</span>
      </div>
      <!-- Tooltip - Only show if not disabled -->
      <div 
        v-if="!disableTooltip"
        class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-sm text-white bg-gray-900 rounded-lg whitespace-nowrap transition-opacity duration-300 z-20"
        :class="{
          'invisible opacity-0': !isTooltipVisible && !isHovering,
          'visible opacity-100': isTooltipVisible || isHovering
        }"
      >
        {{ fullName }}
        <div class="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
      </div>
    </div>
    <span class="ml-2 mb-2" v-if="props.showName">{{ fullName }}</span>
    <span class="ml-2 mb-2" v-if="props.showEmail">{{ props.volunteer?.email }}</span>
  </div>
</template>