<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { useAlertStore } from '@/stores';

import { useAuthStore } from '@/stores';

const schema = Yup.object().shape({
    email: Yup.string().required('email is required'),
});
const alertStore = useAlertStore();  

function onSubmit(values, { setErrors }) {
    const authStore = useAuthStore();
    const { email } = values;

    return authStore.forgot(email).then(()=> {
        alertStore.success("If that email belonged to an account, it will receive a password reset.");
    })
        .catch(error => setErrors({ apiError: error }));
}

</script>
<!-- <template>
  <div class="max-w-md w-full mx-auto mt-8">
    <h1 class="text-3xl font-extrabold mb-4">Set password</h1>
    <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }>
      <div
        v-if="err"
        class="
          p-4
          mb-4
          text-sm text-red-700
          bg-red-100
          rounded-lg
          dark:bg-red-200 dark:text-red-800
        "
        role="alert"
      >
        {{ err }}
      </div>
      <div class="mb-6">
        <label
          for="email"
          class="
            block
            mb-2
            text-sm
            font-medium
            text-gray-900
            dark:text-gray-300
          "
          >Your email</label
        >
        <input
          v-model="email"
          type="email"
          class="
            shadow-sm
            bg-gray-50
            border border-gray-300
            text-gray-900 text-sm
            rounded-lg
            focus:ring-blue-500 focus:border-blue-500
            block
            w-full
            p-2.5
            dark:bg-gray-700
            dark:border-gray-600
            dark:placeholder-gray-400
            dark:text-white
            dark:focus:ring-blue-500
            dark:focus:border-blue-500
            dark:shadow-sm-light
          "
          placeholder="name@oufp.org"
          required
        />
      </div>
      <button
        type="submit"
        class="
          text-white
          bg-blue-700
          hover:bg-blue-800
          focus:ring-4 focus:outline-none focus:ring-blue-300
          font-medium
          rounded-lg
          text-sm
          px-5
          py-2.5
          text-center
          dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800
        "
      >
        New password
      </button>
      
    </Form>
  </div>
</template> -->

<template>
    <div class="max-w-md w-full mx-auto mt-8 stew">

        <h1 class="text-2xl pb-5 pt-2">Set Password</h1>

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
                            focus:ring-blue-500 focus:border-blue-500
                            block
                            w-full
                            p-2.5
                            dark:bg-gray-700
                            dark:border-gray-600
                            dark:placeholder-gray-400
                            dark:text-white
                            dark:focus:ring-blue-500
                            dark:focus:border-blue-500
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
        <div><a href="login" class="hover:underline text-green-700 hover:text-green-900">Back to Login</a></div>
    </div>
</template>
