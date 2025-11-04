<script setup>
import { ref, computed } from 'vue';
import { useAlertStore } from '@/stores';
import { fetchWrapper } from '@/helpers';

const props = defineProps({
  code: String
});

const currentStep = ref(0);
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const formData = ref({
  projectType: '',
  location: '',
  cityName: '',
  requiresMaintenance: '',
  title: '',
  name: '',
  email: '',
  description: ''
});

const projectTypes = [
  'Land Work Project',
  'Cleanup',
  'Art Project',
  'Workshop',
  'Other'
];

const locationOptions = [
  'Yes Oakland!',
  'No, but not far',
  'Out of the area'
];

const maintenanceOptions = [
  'Yes',
  'No'
];

// Computed property to get visible steps based on answers
const visibleSteps = computed(() => {
  const steps = [
    {
      id: 'projectType',
      question: 'What type of project is this?',
      options: projectTypes,
      type: 'button'
    },
    {
      id: 'projectName',
      question: "What's the title of this project?",
      type: 'input'
    },
    {
      id: 'location',
      question: 'Is this in Oakland?',
      options: locationOptions,
      type: 'button'
    }
  ];

  // Only add maintenance question if Land Work Project was selected
  if (formData.value.projectType === 'Land Work Project') {
    steps.push({
      id: 'maintenance',
      question: 'Will this project require regular maintenance for things such as watering?',
      options: maintenanceOptions,
      type: 'button'
    });
  }

  // Add description step (before contact info)
  steps.push({
    id: 'description',
    question: 'Describe your project in high level detail',
    type: 'textarea'
  });

  // Add contact info step (always at the end)
  steps.push({
    id: 'contact',
    question: 'Contact Information',
    type: 'form'
  });

  return steps;
});

const currentQuestion = computed(() => visibleSteps.value[currentStep.value]);
const showLocationInput = computed(() => {
  return formData.value.location && formData.value.location !== 'Yes Oakland!';
});

function selectProjectType(type) {
  formData.value.projectType = type;
  nextStep();
}

function handleProjectTitle() {
  if (formData.value.title.trim()) {
    nextStep();
  }
}

function selectLocation(location) {
  formData.value.location = location;
  if (location === 'Yes Oakland!') {
    formData.value.cityName = 'Oakland';
    nextStep();
  }
}

function handleLocationInput() {
  if (formData.value.cityName.trim()) {
    nextStep();
  }
}

function selectMaintenance(answer) {
  formData.value.requiresMaintenance = answer;
  nextStep();
}

function handleDescription() {
  if (formData.value.description.trim()) {
    nextStep();
  }
}

async function handleContactInfo() {
  if (formData.value.name.trim() && formData.value.email.trim()) {
    await submitApplication();
  }
}

async function submitApplication() {
  const alertStore = useAlertStore();
  const payload = prepareSubmissionPayload();
  
  isSubmitting.value = true;
  
  try {
    await fetchWrapper.post(`${import.meta.env.VITE_API_URL}/api/applications`, { data: payload });
    isSubmitting.value = false;
    isSubmitted.value = true;
  } catch (error) {
    const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to submit application. Please try again.');
    alertStore.error(errorMessage);
    isSubmitting.value = false;
  }
}

// Prepare submission payload with API field names
function prepareSubmissionPayload() {
  return {
    project_type: formData.value.projectType, // Maps to project_type for API
    location: formData.value.location,
    city_name: formData.value.cityName,
    requires_maintenance: formData.value.requiresMaintenance,
    name: formData.value.name,
    email: formData.value.email,
    title: formData.value.title,
    description: formData.value.description
  };
}

function nextStep() {
  // Wait a moment for transition, then move to next step
  setTimeout(() => {
    if (currentStep.value < visibleSteps.value.length - 1) {
      currentStep.value++;
    }
  }, 100);
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
    // If going back to step 0, we don't need to reset anything
    // Location data is preserved so user can see their previous selection
  }
}
</script>

<template>
  <div class="bg-custom-light rounded-md p-5 min-h-[500px]">
    <!-- Thank You Message (shown after successful submission) -->
    <div v-if="isSubmitted" class="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <svg class="w-20 h-20 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h1 class="text-3xl font-bold mb-4 text-green-600">Thank You!</h1>
        <p class="text-xl text-gray-700 leading-relaxed">
          Thank you for submitting your community project to Garden Steward! Give us a moment to check it out and we'll be in touch!
        </p>
      </div>
    </div>

    <!-- Form (shown before submission) -->
    <div v-else>
      <h1 class="text-3xl font-bold mb-2">The Garden Steward Coop Network</h1>
      <h4 class="text-lg mb-8">Do you have a garden project you'd like to manage through Garden Steward? Join our network!</h4>
      
      <!-- Progress indicator -->
      <div class="mb-8">
        <div class="flex items-center justify-center space-x-2">
          <div 
            v-for="(step, index) in visibleSteps" 
            :key="step.id"
            class="flex items-center"
          >
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
              :class="index <= currentStep ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'"
            >
              <span class="text-sm font-semibold">{{ index + 1 }}</span>
            </div>
            <div 
              v-if="index < visibleSteps.length - 1"
              class="w-12 h-1 transition-all duration-300"
              :class="index < currentStep ? 'bg-green-600' : 'bg-gray-300'"
            ></div>
          </div>
        </div>
      </div>

      <!-- Question container with transitions -->
      <div class="question-container relative min-h-[300px]">
        <!-- Loading Spinner (shown during submission) -->
        <div v-if="isSubmitting" class="question-content flex flex-col items-center justify-center min-h-[300px]">
          <div class="spinner-border text-green-600 mb-4" role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <p class="text-lg text-gray-700">Submitting your application...</p>
        </div>
        
        <transition v-else name="slide-fade" mode="out-in">
        <!-- Project Type Question -->
        <div v-if="currentStep === 0" :key="'step-0'" class="question-content">
          <h2 class="text-2xl font-semibold mb-6 text-center">{{ currentQuestion.question }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              v-for="type in projectTypes"
              :key="type"
              @click="selectProjectType(type)"
              class="project-type-btn p-6 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              :class="formData.projectType === type 
                ? 'border-green-600 bg-green-50 text-green-800' 
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'"
            >
              <span class="text-lg font-medium">{{ type }}</span>
            </button>
          </div>
        </div>

        <!-- Project Title Question -->
        <div v-else-if="currentQuestion && currentQuestion.id === 'projectName'" :key="'step-1'" class="question-content">
          <h2 class="text-2xl font-semibold mb-6 text-center">{{ currentQuestion.question }}</h2>
          <div class="max-w-md mx-auto">
            <input
              v-model="formData.title"
              @keyup.enter="handleProjectTitle"
              type="text"
              placeholder="Enter project name"
              class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all duration-300 outline-none"
              autofocus
            />
            <button
              @click="handleProjectTitle"
              :disabled="!formData.title.trim()"
              class="mt-6 w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg"
            >
              Continue
            </button>
          </div>
        </div>

        <!-- Location Step (includes both question and input) -->
        <div v-else-if="currentQuestion && currentQuestion.id === 'location'" :key="'step-location'" class="question-content">
          <!-- Location Question Buttons -->
          <div v-if="!showLocationInput">
            <h2 class="text-2xl font-semibold mb-6 text-center">{{ currentQuestion.question }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <button
                v-for="location in locationOptions"
                :key="location"
                @click="selectLocation(location)"
                class="project-type-btn p-6 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                :class="formData.location === location 
                  ? 'border-green-600 bg-green-50 text-green-800' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'"
              >
                <span class="text-lg font-medium">{{ location }}</span>
              </button>
            </div>
          </div>

          <!-- Location Input (if not Oakland) -->
          <div v-else>
            <h2 class="text-2xl font-semibold mb-6 text-center">Where is this project located?</h2>
            <div class="max-w-md mx-auto">
              <input
                v-model="formData.cityName"
                @keyup.enter="handleLocationInput"
                type="text"
                placeholder="Enter city or location"
                class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all duration-300 outline-none"
                autofocus
              />
              <button
                @click="handleLocationInput"
                :disabled="!formData.cityName.trim()"
                class="mt-6 w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        <!-- Maintenance Question (only for Land Work Project) -->
        <div v-else-if="currentQuestion && currentQuestion.id === 'maintenance'" :key="'step-maintenance'" class="question-content">
          <h2 class="text-2xl font-semibold mb-6 text-center">{{ currentQuestion.question }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
            <button
              v-for="option in maintenanceOptions"
              :key="option"
              @click="selectMaintenance(option)"
              class="project-type-btn p-6 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              :class="formData.requiresMaintenance === option 
                ? 'border-green-600 bg-green-50 text-green-800' 
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'"
            >
              <span class="text-lg font-medium">{{ option }}</span>
            </button>
          </div>
        </div>

        <!-- Description Question -->
        <div v-else-if="currentQuestion && currentQuestion.id === 'description'" :key="'step-description'" class="question-content">
          <h2 class="text-2xl font-semibold mb-6 text-center">{{ currentQuestion.question }}</h2>
          <div class="max-w-2xl mx-auto">
            <textarea
              v-model="formData.description"
              placeholder="Describe your project in detail..."
              rows="6"
              class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all duration-300 outline-none resize-y"
              autofocus
            ></textarea>
            <button
              @click="handleDescription"
              :disabled="!formData.description.trim()"
              class="mt-6 w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg"
            >
              Continue
            </button>
          </div>
        </div>

        <!-- Contact Information Step -->
        <div v-else-if="currentQuestion && currentQuestion.id === 'contact'" :key="'step-contact'" class="question-content">
          <h2 class="text-2xl font-semibold mb-6 text-center">What's your name and email?</h2>
          <div class="max-w-md mx-auto space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                id="name"
                v-model="formData.name"
                @keyup.enter="handleContactInfo"
                type="text"
                placeholder="Your name"
                class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all duration-300 outline-none"
                autofocus
              />
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="email"
                v-model="formData.email"
                @keyup.enter="handleContactInfo"
                type="email"
                placeholder="your.email@example.com"
                class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all duration-300 outline-none"
              />
            </div>
            <button
              @click="handleContactInfo"
              :disabled="!formData.name.trim() || !formData.email.trim()"
              class="mt-6 w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg"
            >
              Continue
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- Navigation buttons -->
    <div v-if="!isSubmitting" class="mt-8 flex justify-between items-center">
      <button
        v-if="currentStep > 0"
        @click="prevStep"
        class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
      >
        ← Back
      </button>
      <div v-else></div>
      <div class="text-sm text-gray-600">
        Step {{ currentStep + 1 }} of {{ visibleSteps.length }}
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* HTML5 CSS Transitions */
.question-container {
  perspective: 1000px;
}

.question-content {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Vue transition classes for slide-fade */
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.project-type-btn {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-type-btn:active {
  transform: scale(0.98);
}

/* Smooth transitions for progress indicator */
.progress-dot {
  transition: all 0.3s ease;
}

/* Loading spinner styles */
.spinner-border {
  display: inline-block;
  width: 3rem;
  height: 3rem;
  vertical-align: text-bottom;
  border: 0.25em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border 0.75s linear infinite;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg);
  }
}
</style>
