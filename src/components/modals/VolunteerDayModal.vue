<script>
export default {
  props: {
   title: String,
   blurb: String
 },
  data() {
    return {
      show: false,
    }
  },
}
</script>

<template>

  <div v-if="title">
    <a @click="show = true">{{ title }}</a>
  </div>

  <button v-else type="button" class="px-6
              py-2.5
              bg-blue-600
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-blue-700 hover:shadow-lg
              focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-blue-800 active:shadow-lg
              transition
              duration-150
              ease-in-out" @click="show = true">
              Create Volunteer Day
            </button>
  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <!-- Show / hide the modal -->
    <div v-if="show" class="">
      <!-- The backdrop -->
      <div class="fixed inset-0 bg-gray-900 opacity-40"></div>

      <!-- Where the actual content goes -->
      <div class="fixed inset-0 flex items-center justify-center">
        <div class="bg-white text-black p-3">
          <slot></slot>
          <p class="p-1">Volunteer Day Title: {{ title }}</p>
          <input class="p-1 mb-5" type="text"
            :value="title"
            @input="$emit('update:title', $event.target.value)" />
          <p class="p-1">Blurb: {{ blurb }}</p>
          <textarea v-model="body" class="form-control"></textarea>
          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-gray-200 rounded-b-md">
            <button type="button" class="px-6
              py-2.5
              bg-purple-600
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-purple-700 hover:shadow-lg
              focus:bg-purple-700 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-purple-800 active:shadow-lg
              transition
              duration-150
              ease-in-out" @click="show = false">Close</button>

            <button type="button" class="px-6
              py-2.5
              bg-blue-600
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-blue-700 hover:shadow-lg
              focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-blue-800 active:shadow-lg
              transition
              duration-150
              ease-in-out
              ml-1">Save changes</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>