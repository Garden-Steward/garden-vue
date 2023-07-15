<script>
import { computed } from "vue";
import { useGardenTaskStore, useAlertStore } from '@/stores';
// import { bool } from "yup";

export default {
  props: {
   title: String,
   blurb: String,
   endText: String,
   startDatetime: String,
   createdAt: String,
   updatedAt: String,
   publishedAt: String,
   max_volunteers: Number,
   id: Number,
   garden: Number,
   dayId: Number,
   interests: Array,
   interest: String,
   task: Object,
   status: String,
   overview: String,
   type: String,
 },
 setup(props) {
  const gardenTaskStore = useGardenTaskStore();  
  const alertStore = useAlertStore();  
  const createTask = computed(()=> {
    if (new Date(`${props.startDatetime}`) < new Date()) {
      return false
    } else {
      return true
    }
  })
  const topic = computed(()=> {
    return (props.id) ? "Edit Title:" : "Garden Task Title:"
  })
  const submitText = computed(()=> {
    return (props.id) ? "Update Task" : "Create Task"
  })
  const notification = computed(() => {
    if (props.status !== 'INITIALIZED') {
      return "This Garden task has already happened, no SMS will be auto-sent.";
    } else {
      return "SMS sends out 3 days before, and day of. Disabling stops SMS"
    }
  })
  return {alertStore, gardenTaskStore, topic, notification, createTask, submitText};
 },
  data() {
    return {
      show: false,
      copy: false,
      volunteers: false,
      error: false,
      form : {
        title: this.title,
        type: this.type,
        overview: this.overview,
        max_volunteers: this.max_volunteers,
        status: this.status
      }
    }
  },
  methods: {
    async submit() {
      let message;
      this.copy = false;
      this.show = false;
      this.form.garden = this.garden;
      this.form.volunteer_day = this.dayId;
      console.log(this.form, 'submitted')
      if (this.id) {
          await this.gardenTaskStore.update(this.id, this.form);
          message = 'Garden Task updated';
          this.show=false;
          this.alertStore.success(message);
      } else {
          await this.gardenTaskStore.register(this.form);
          message = 'Garden Task added';
      }
    },
  }
}
</script>

<template>

  <div v-if="task" class="border-r-3 border rounded p-4 bg-slate-100 hover:opacity-75 cursor-pointer"  @click="show = true">
    <a class="hover:text-blue ">
      <span class="underline text-xl">title: {{ task.title }}</span>
      <br />
    </a>
  </div>
  <div v-else>
    <button v-if="createTask" type="button" class="px-6 mt-2
                py-2.5
                bg-slate-600
                text-white
                font-medium
                text-xs
                leading-tight
                uppercase
                rounded
                shadow-md
                hover:bg-slate-700 hover:shadow-lg
                focus:bg-slate-700 focus:shadow-lg focus:outline-none focus:ring-0
                active:bg-slate-800 active:shadow-lg
                transition
                duration-150
                ease-in-out" @click="show = true">
                Create Task
              </button>
  </div>

  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <!-- Show / hide the modal -->
    <div v-if="show" class="w-xl">
      <!-- The backdrop -->
      <div class="fixed inset-0 bg-gray-900 opacity-40"></div>


      
      <!-- *** START FORM *** -->


      <form @submit.prevent="submit">

      <div class="fixed inset-0 flex items-center justify-center">
        <div class="bg-white text-black p-6 w-50">
          <slot></slot>

          <p class="pb-1">{{ topic }}</p>
          <input class="p-1 mb-3 rounded-md border" type="text" v-model="form.title" />
          
          <p class="p-1">Task Information:</p>
          <textarea v-model="form.overview" class="form-control p-1 m-r-4 mb-1"></textarea>

          <p class="p-1">Type:</p>
          
          <select v-model="form.type" class="rounded-md border p-1 ml-1">
            <option>General</option>
            <option>Water</option>
            <option>Weeding</option>
            <option>Planting</option>
            <option>Harvest</option>
          </select>
          
          <p class="p-1">Max Volunteers:</p>
          <select v-model="form.max_volunteers" class="rounded-md border p-1 ml-1">
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
              <option>5</option>
            </select>

          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-gray-200 rounded-b-md">
            <button class="px-6
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
              ml-1" type="submit">{{ submitText }}</button>
          </div>


          <div v-if="error" class="text-danger">Error loading garden task: {{error}}</div>
          <div class="pr-4 justify-end flex flex-shrink-0 flex-wrap items-center">
            <button type="button" class="px-6
                py-2.5
                text-red
                font-medium
                text-xs
                leading-tight
                uppercase
                rounded
                border-0
                hover:hover:shadow-lg
                focus:focus:shadow-lg focus:outline-none focus:ring-0
                active:shadow-lg
                transition
                duration-150
                ease-in-out" @click="()=> {show = false;copy= false}">Close</button>
          </div>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>