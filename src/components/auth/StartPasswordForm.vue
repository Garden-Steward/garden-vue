
<script setup>
import { Form, Field } from 'vee-validate';
import { useAuthStore, useAlertStore } from '@/stores';

function onSubmit(values, { setErrors }) {
  const authStore = useAuthStore();
  const alertStore = useAlertStore();
    const { email } = values;

    return authStore.forgot(email).then(()=> {
        alertStore.success("If that email belonged to an account, it will receive a password reset.");
    }).catch(error => setErrors({ apiError: error }));

}
</script>

<template>
  
  <h1 class="text-2xl pb-5 pt-2">Start Set Password Flow</h1>
    
    <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
        <div class="form-group">
            <label>Your Email</label>
            <Field name="email" type="text" class="
                        form-control
                        shadow-sm
                        bg-gray-50
                        border border-gray-300
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
                    " placeholder="name@oufp.org" />
            <div class="invalid-feedback">{{errors.email}}</div>
        </div>            
        <div class="form-group">
            <button class="btn btn-primary bg-green-800" :disabled="isSubmitting">
                <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
                Get Password
            </button>
        </div>
        <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{errors.apiError}}</div>
    </Form>
</template>