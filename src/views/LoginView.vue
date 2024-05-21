<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAuthStore } from '@/stores';

const schema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required')
});

function onSubmit(values, { setErrors }) {
    const authStore = useAuthStore();
    console.log("starting login")
    const { username, password } = values;

    return authStore.login(username, password)
        .catch(error => setErrors({ apiError: error }));
}

</script>

<template>
    <div class="max-w-md w-full mx-auto mt-8 stew">
        <div class="stew-logo-wrapper">
            <img class="stew-logo mx-auto" src="https://storage.googleapis.com/cdn.sacshiki.com/assets/garden_steward/hotlink-ok/garden_steward_logo_peach_sq_350.jpg" alt="Steward Logo">
        </div>

        <div class="text-lg mt-6 max-w-md w-full mx-auto mt-8 mb-4">
          Garden Steward helps manage volunteer days and weekly tasks for community garden projects. Apply for your garden to be managed by Garden Steward. Applications are approved on a case by case basis. (Sliding Scale - BIPOC welcome)
          <p><a href="/apply" class="hover:underline text-slate-50 mt-3 btn btn-primary bg-custom-green hover:bg-custom-green border-white">
              Apply Now
          </a></p>
      </div>

      <h3 class="text-xl mt-10 mb-3">Garden Steward Login:</h3>
        <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
            <div class="form-group">
                <label class="text-green-900">Email</label>
                <Field name="username" type="text" class="form-control" :class="{ 'is-invalid': errors.username }" />
                <div class="invalid-feedback">{{errors.username}}</div>
            </div>            
            <div class="form-group">
                <label class="text-green-900">Password</label>
                <Field name="password" type="password" class="form-control" :class="{ 'is-invalid': errors.password }" />
                <div class="invalid-feedback">{{errors.password}}</div>
            </div>            
            <div class="form-group">
                <button class="hover:underline text-slate-50 btn btn-primary bg-custom-green hover:bg-custom-green border-white" :disabled="isSubmitting">
                    <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
                    Login
                </button>
            </div>
            <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{errors.apiError}}</div>
        </Form>
        <div><a href="set-password" class="hover:underline text-green-700 hover:text-green-900">Set Password</a></div>
    </div>
</template>

<style>
  label {
    font-weight: bold;
    font-size: 1.1em;
  }
  .stew {
    /* display: flex; */
    max-width: 60rem;
    margin: 0 auto;
    padding: 1.5rem;
    border-radius: 0.5rem;
    background-color: #f7f1e3;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  .stew-logo-wrapper {
    flex-shrink: 0;
  }
  .stew-logo {
    height: 15rem;
    width: 15rem;
  }
  .color-green {
    color:#f7f1e3;
  }
</style>