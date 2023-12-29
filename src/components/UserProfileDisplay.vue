<script setup>

const props = defineProps({
  volunteer: Object,
});

const generateInitials = (user) => {
  const name = user.username.split(' ');
  const initials = name[0].charAt(0) + name[name.length-1].charAt(0);
  return initials.toUpperCase();
}

</script>

<template>

      <!-- User Profile -->
      <div :class="'bg-'+ props.volunteer.color +'-500'" class="h-10 w-10 rounded-full flex items-center justify-center">
        <span class="text-white font-bold uppercase">{{ generateInitials(props.volunteer) }}</span>
      </div>
      <span class="ml-2">{{ props.volunteer.username }}</span>

</template>

<style>
</style>