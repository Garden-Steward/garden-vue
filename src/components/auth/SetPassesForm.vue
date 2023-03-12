
<script setup>
import { Form, Field } from 'vee-validate';
import { useAuthStore } from '@/stores';
import { useAlertStore } from '@/stores';

const props = defineProps({
  code: String
})
function setPassword(values, { setErrors }) {
// const setPassword = (values, { setErrors }) => {
    console.log(values)
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
  
  <Form @submit="setPassword" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
              <div class="form-group">
                  <label>Password</label>
                  <Field type="password" id="password" name="password" placeholder="Password" class="
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
                              dark:bg-gray-700
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
                  <label>Repeat Password</label>
                  <Field type="password" id="passwordConfirmation" name="passwordConfirmation" placeholder="Repeat password" class="
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
                              dark:bg-gray-700
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
                  <button class="btn btn-primary bg-green-800" :disabled="isSubmitting">
                      <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
                      Set Password
                  </button>
              </div>
              <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{errors.apiError}}</div>
          </Form>
</template>