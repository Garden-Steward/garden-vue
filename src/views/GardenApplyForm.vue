<script setup>
import { ref } from 'vue';
import { Form, Field } from 'vee-validate';
import { useAuthStore } from '@/stores';
import { useAlertStore } from '@/stores';

const props = defineProps({
  code: String
});

const selectedLocation = ref('Oakland');

function setPassword(values, { setErrors }) {
    const authStore = useAuthStore();
    const alertStore = useAlertStore();
    const {password, passwordConfirmation} = values
    return authStore.setPassword(password, passwordConfirmation, props.code).then(()=> {
        alertStore.success("Password Reset! Redirecting to homepage.");
    })
        .catch(error => setErrors({ apiError: error }));

}
</script>

<template>
  <div class="bg-custom-light rounded-md p-5"> <!-- Adjusted classes here -->
    <h1 class="text-3xl font-bold">The Garden Steward Coop Network</h1>
    <h4 class="text-lg mb-5">Do you have a garden project you'd like to manage through Garden Steward? Join our network!</h4>
    <Form @submit="setPassword" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      <div class="form-group mb-4">
        <label for="location" class="block mb-2">Location</label>
        <Field as="select" id="location" name="location" v-model="selectedLocation" class="
          form-control
          shadow-sm
          bg-gray-50
          border-gray-300
          border
          text-gray-900
          text-sm
          rounded-lg
          focus:ring-green-500 focus:border-green-500
          block
          w-full
          px-3
          py-2
          leading-tight
        ">
          <option value="Oakland">Oakland</option>
          <option value="Other">Other</option>
        </Field>
      </div>
      
      <div v-if="selectedLocation === 'Other'" class="form-group mb-4">
        <label for="cityName" class="block mb-2">City Name</label>
        <Field id="cityName" name="cityName" placeholder="Enter your city" class="
          form-control
          shadow-sm
          bg-gray-50
          border-gray-300
          border
          text-gray-900 text-sm
          rounded-lg
          focus:ring-green-500 focus:border-green-500
          block
          w-full
          p-2.5
        " />
        <div class="invalid-feedback">{{errors.cityName}}</div>
      </div>

      <div class="form-group mb-4">
        <label for="title" class="block mb-2">Garden Name</label>
        <Field id="title" name="title" placeholder="Garden Name" class="
          form-control
          shadow-sm
          bg-gray-50
          border-gray-300
          border
          text-gray-900 text-sm
          rounded-lg
          focus:ring-green-500 focus:border-green-500
          block
          w-full
          p-2.5
        " />
        <div class="invalid-feedback">{{errors.title}}</div>
      </div>
      <div class="form-group">
        <label>Contact Information:</label>
        <Field type="name" id="name" name="name" placeholder="Name" class="
          form-control
          shadow-sm
          bg-gray-50
          border-gray-300
          border
          text-gray-900 text-sm
          rounded-lg
          focus:ring-green-500 focus:border-green-500
          block
          w-full
          p-2.5
          dark:border-gray-600
          dark:placeholder-gray-400
          dark:text-white
          dark:focus:ring-green-500
          dark:focus:border-green-500
          dark:shadow-sm-light
        " />
        <Field type="email" id="email" name="email" placeholder="Email" class="
          form-control
          shadow-sm
          bg-gray-50
          border-gray-300
          border
          text-gray-900 text-sm
          rounded-lg
          focus:ring-green-500 focus:border-green-500
          block
          w-full
          p-2.5
          dark:border-gray-600
          dark:placeholder-gray-400
          dark:text-white
          dark:focus:ring-green-500
          dark:focus:border-green-500
          dark:shadow-sm-light
        " />
        <div class="invalid-feedback">{{errors.email}}</div>
      </div>
      <div class="form-group">
        <label for="description">Description</label>
        <Field as="textarea" id="description" name="description" placeholder="Describe your garden project" class="
          form-control
          shadow-sm
          bg-gray-50
          border-gray-300
          border
          text-gray-900 text-sm
          rounded-lg
          focus:ring-green-500 focus:border-green-500
          block
          w-full
          p-2.5
          dark:border-gray-600
          dark:placeholder-gray-400
          dark:text-white
          dark:focus:ring-green-500
          dark:focus:border-green-500
          dark:shadow-sm-light
        " rows="4"></Field>
        <div class="invalid-feedback">{{errors.description}}</div>
      </div>
      <div class="form-group">
        <button class="btn btn-primary bg-green-800" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Ask to Join
        </button>
      </div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{errors.apiError}}</div>
    </Form>
  </div>
</template>
