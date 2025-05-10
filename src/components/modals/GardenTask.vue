<script setup>
import { computed, ref, watch } from "vue";
import { useGardenTaskStore, useAlertStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';
// import { bool } from "yup";

const props = defineProps({
  title: String,
  blurb: String,
  endText: String,
  startDatetime: String,
  createdAt: String,
  updatedAt: String,
  started_at: String,
  completed_at: String,
  publishedAt: String,
  max_volunteers: Number,
  volunteers: Array,
  id: Number,
  garden: Number,
  dayId: Number,
  interests: Array,
  interest: String,
  task: Object,
  status: String,
  overview: String,
  type: String,
  primary_image: Object,
  editor: {
    type: Boolean,
    default: false
  }
});

const gardenTaskStore = useGardenTaskStore();
const alertStore = useAlertStore();

const show = ref(false);
const copy = ref(false);
const error = ref(false);
const imagePreview = ref(null);
const imageFile = ref(null);

const form = ref({
  title: props.title || '',
  type: props.type || '',
  overview: props.overview || '',
  max_volunteers: props.max_volunteers || null,
  status: props.status || '',
  primary_image: props.primary_image || null,
});

// Store the initial form state for dirty checking
const initialForm = ref({ ...form.value });

const showCreateButton = computed(() => {
  console.log('Editor status:', props.editor);
  console.log('Has ID:', !!props.id);
  return props.editor === true && !props.id;
});

watch(() => props.editor, (newVal) => {
  console.log('Editor prop changed:', newVal);
});

const topic = computed(() => {
  return (props.id) ? "Edit Title:" : "Garden Task Title:";
});

const submitText = computed(() => {
  return (props.id) ? "Update Task" : "Create Task";
});

// Watch handlers
watch(() => props.title, (newVal) => {
  form.value.title = newVal;
});

watch(() => props.type, (newVal) => {
  form.value.type = newVal;
});

watch(() => props.overview, (newVal) => {
  form.value.overview = newVal;
});

watch(() => props.max_volunteers, (newVal) => {
  form.value.max_volunteers = newVal;
});

watch(() => props.volunteers, (newVal) => {
  form.value.volunteers = newVal;
});

watch(() => props.status, (newVal) => {
  form.value.status = newVal;
});

watch(() => props.primary_image, (newVal) => {
  if (newVal) {
    form.value.primary_image = newVal;
    imagePreview.value = newVal.formats?.medium?.url;
  }
});

// Watch for changes to props.task and update initialForm
watch(() => props.task, (newVal) => {
  if (newVal) {
    form.value = {
      ...form.value,
      primary_image: newVal.primary_image || null,
    };
    if (newVal.primary_image?.formats?.medium) {
      imagePreview.value = newVal.primary_image.formats.medium.url;
    }
    initialForm.value = { ...form.value };
  }
}, { deep: true });

// Add computed property for filtered volunteers
const filteredVolunteers = computed(() => {
  // If volunteers is an array, return it as-is (legacy support)
  if (Array.isArray(props.volunteers)) {
    return props.volunteers.filter(volunteer => volunteer?.attributes);
  }
  // If volunteers is an object with a data array, return that
  if (props.volunteers?.data && Array.isArray(props.volunteers.data)) {
    return props.volunteers.data.filter(volunteer => volunteer?.attributes);
  }
  return [];
});

// Computed property to check if the form is dirty
const isDirty = computed(() => {
  return Object.keys(form.value).some(key => {
    if (typeof form.value[key] === 'object') {
      return JSON.stringify(form.value[key]) !== JSON.stringify(initialForm.value[key]);
    }
    return form.value[key] !== initialForm.value[key];
  }) || !!imageFile.value;
});

// Methods
const submit = async () => {
  let message;
  copy.value = false;
  show.value = false;
  form.value.garden = props.garden;
  form.value.volunteer_day = props.dayId;
  
  try {
    // Handle image upload first if there's a new image
    if (imageFile.value) {
      const formData = new FormData();
      formData.append('files', imageFile.value);
      
      const uploadedImage = await gardenTaskStore.uploadImage(formData);
      if (uploadedImage?.id) {
        form.value.primary_image = {
          id: uploadedImage.id
        };
      }
    } else if (form.value.primary_image?.id) {
      // Ensure existing image is properly formatted
      form.value.primary_image = {
        id: form.value.primary_image.id
      };
    }

    // Then proceed with task creation/update
    if (props.id) {
      const updatedTask = await gardenTaskStore.update(props.id, form.value);
      message = 'Garden Task updated';
      if (updatedTask) {
        form.value = { ...form.value, ...updatedTask };
      }
    } else {
      form.value.status = 'INITIALIZED';
      const newTask = await gardenTaskStore.register(form.value);
      message = 'Garden Task added';
      if (newTask) {
        form.value = { ...form.value, ...newTask };
      }
    }
    
    show.value = false;
    alertStore.success(message);
    // Update initialForm after successful submit
    initialForm.value = { ...form.value };
    imageFile.value = null;
  } catch (error) {
    console.error('Error submitting task:', error);
    alertStore.error('Failed to save task');
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const takePicture = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    // Here you would typically open a modal/dialog with the camera stream
    // For this example, we'll just use the file input as a fallback
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => handleFileUpload(e);
    input.click();
  } catch (err) {
    console.error('Error accessing camera:', err);
    alert('Unable to access camera. Please check permissions or use file upload instead.');
  }
};

const primaryImageUrl = computed(() => {
  // Preview of new image (if a new file is selected)
  if (imagePreview.value) {
    return imagePreview.value;
  }
  // Uploaded or edited image
  if (form.value.primary_image?.formats?.medium?.url) {
    return form.value.primary_image.formats.medium.url;
  }
  // Loaded from API
  if (form.value.primary_image?.data?.attributes?.formats?.medium?.url) {
    return form.value.primary_image.data.attributes.formats.medium.url;
  }
  return null;
});
</script>

<template>
  <div v-if="id" class="bg-slate-100 hover:opacity-75 cursor-pointer rounded-lg p-2 pr-0 mb-3" @click="show = true">
    <a class="hover:text-blue">
      <div class="flex flex-col md:grid md:grid-cols-12 md:gap-4 items-center w-full">
        <!-- Header: Title and Status -->
        <div class="flex w-full items-center justify-between md:col-span-4 md:block">
          <div class="text-lg font-medium w-full">{{ form.title }}</div>
          <span 
            :class="{
              'bg-peach-100 text-peach-800': form.status === 'INITIALIZED',
              'bg-gray-100 text-gray-800': form.status !== 'INITIALIZED'
            }"
            class="px-3 py-1 rounded-full text-sm font-medium ml-2 md:ml-0 md:mt-2 md:float-right"
          >
            {{ form.status === 'INITIALIZED' ? 'Ready' : form.status }}
          </span>
        </div>
        <!-- Category -->
        <div class="text-gray-600 w-full md:col-span-4 md:block md:mt-1">{{ form.type }}</div>
        <!-- User Profiles: Desktop only -->
        <div class="hidden md:block md:col-span-4">
          <div v-if="filteredVolunteers.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <UserProfileDisplay 
              v-for="volunteer in filteredVolunteers" 
              :key="volunteer.id"
              :volunteer="volunteer.attributes"
            />
          </div>
        </div>
        <!-- User Profiles: Mobile only, at bottom -->
        <div class="block md:hidden w-full mt-2">
          <div v-if="filteredVolunteers.length" class="flex flex-wrap gap-2">
            <UserProfileDisplay 
              v-for="volunteer in filteredVolunteers" 
              :key="volunteer.id"
              :volunteer="volunteer.attributes"
            />
          </div>
        </div>
      </div>
    </a>
  </div>
  
  <div v-else-if="showCreateButton">
    <button type="button" class="px-6
                p-2.5
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
                ease-in-out
                float-right
                text-sm" @click="show = true">
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

      <div class="fixed inset-0 flex items-center justify-start overflow-x-hidden overflow-y-auto py-6">
        <div class="bg-white text-black grid grid-cols-1 md:w-1/2 w-[90%] gap-2 p-3 mx-auto max-w-[95vw] max-h-[90vh] overflow-y-auto my-auto">
          <slot></slot>

          <div class="flex items-center gap-4 mb-3">
            <div class="flex-1">
              <p class="pb-1">{{ topic }}</p>
              <input 
                class="p-1 rounded-md border w-full leading-tight" 
                type="text" 
                v-model="form.title" 
              />
            </div>
            
            <div class="min-w-fit">
              <div class="flex items-center gap-1 pb-1">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                </svg>
                <span>Max:</span>
              </div>
              <select v-model="form.max_volunteers" class="rounded-md border p-1 w-fit">
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
              </select>
            </div>
          </div>
          
          <p class="p-1 mb-0 mt-0">Explain the task more:</p>
          <textarea v-model="form.overview" class="form-control p-1 m-r-4 mb-1"></textarea>

          <div class="flex flex-col space-y-2 mb-4">
            <label class="text-sm font-medium text-gray-700">Add Photo</label>
            
            <!-- Show existing image if available -->
            <img 
              v-if="primaryImageUrl" 
              :src="primaryImageUrl" 
              class="mt-2 max-w-xs rounded-lg shadow-md" 
              alt="Current image"
            />
            
            <!-- Show preview of new image -->
            <img 
              v-else-if="imagePreview" 
              :src="imagePreview" 
              class="mt-2 max-w-xs rounded-lg shadow-md" 
              alt="Preview"
            />
            
            <div class="flex space-x-2">
              <label class="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                <svg class="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ form.primary_image?.data ? 'Change Photo' : 'Upload Photo' }}
                <input 
                  type="file" 
                  class="hidden" 
                  accept="image/*"
                  @change="handleFileUpload"
                >
              </label>

              <button 
                type="button"
                class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                @click="takePicture"
              >
                <svg class="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            </div>
          </div>

          <p class="p-1 pb-0 text-md text-gray-700 mb-0">What kind of task?:</p>
          <select v-model="form.type" class="rounded-md border p-1 ml-1 text-lg">
            <option class="text-lg py-1">General</option>
            <option class="text-lg py-1">Watering</option>
            <option class="text-lg py-1">Weeding</option>
            <option class="text-lg py-1">Planting</option>
            <option class="text-lg py-1">Harvesting</option>
          </select>

          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-gray-200 rounded-b-md">
            <div v-if="error" class="text-danger">Error loading garden task: {{error}}</div>
            <div class="pr-4 flex flex-row-reverse flex-shrink-0 flex-wrap items-center gap-2 justify-end">
              <button v-if="isDirty" class="px-6
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
                ease-in-out" type="submit">{{ submitText }}</button>
              <button type="button" class="px-5
                py-2.5
                m-0
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
      </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.text-peach-800 {
  color: #9B4E34;
}
.bg-peach-100 {
  background-color: #FFE5D9;
}
</style>