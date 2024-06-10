<script setup>

const props = defineProps({
  volunteer: Object,
  showEmail: Boolean
});

const generateInitials = (user) => {
  const name = user.username.split(' ');
  const initials = name[0].charAt(0) + name[name.length-1].charAt(0);
  return initials.toUpperCase();
}

const userBubbleColor = props.volunteer.color ? props.volunteer.color : 'green'

</script>

<template>

      <!-- Flex container with wrapping enabled -->
      <div class="flex flex-wrap items-center justify-start">
        <!-- User Profile -->
        <div :class="'bg-'+ userBubbleColor +'-500'" class="h-10 w-10 rounded-full flex items-center justify-center">
          <span class="text-white font-bold uppercase">{{ generateInitials(props.volunteer) }}</span>
        </div>
        <span class="ml-2 mb-2" v-if="props.showEmail">{{ props.volunteer.username }}</span>
      </div>

</template>

<style>
</style>