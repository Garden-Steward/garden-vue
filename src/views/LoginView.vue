<script setup>
import { ref } from 'vue';
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAuthStore } from '@/stores';
import PhoneRegistration from '@/components/PhoneRegistration.vue';

const schema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required')
});

const authStore = useAuthStore();
const showRegisterModal = ref(false);

function onSubmit(values, { setErrors }) {
    console.log("starting login")
    const { username, password } = values;

    return authStore.login(username, password)
        .catch(error => setErrors({ apiError: error }));
}

function openPhoneLogin() {
    authStore.openLoginModal('/manage');
}

function openRegisterModal() {
    showRegisterModal.value = true;
}

function closeRegisterModal() {
    showRegisterModal.value = false;
}

</script>

<template>
    <!-- Dark: single canvas green (#2d3e26 via body); panel uses ring + border only (second color = structure, not another fill). -->
    <div class="max-w-md w-full mx-auto mt-8 stew bg-custom-light dark:bg-transparent rounded-md p-5 border border-transparent dark:border-[#3d4d36]/90 dark:ring-1 dark:ring-white/10 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
        <div class="stew-logo-wrapper">
            <img class="stew-logo mx-auto" src="https://storage.googleapis.com/steward_upload/uploads/garden_steward_logo_green_sq_350_75514db053/garden_steward_logo_green_sq_350_75514db053.jpg" alt="Steward Logo">
        </div>

        <div class="text-lg mt-8 max-w-md w-full mx-auto mb-4 text-gray-800 dark:text-[#d0d0d0]">
                  <p>Garden Steward is a community-driven, open-source project developing SMS-first software for managing volunteer events, watering schedules, and harvest coordination. </p>
              </div>

              <div class="max-w-md mx-auto mb-6">
                <button type="button" @click="openPhoneLogin" class="login-phone-btn">
                  <svg class="login-phone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Sign in with your phone
                </button>
                <p class="login-phone-sub">We'll text you a 6-digit code. No password needed.</p>
              </div>

              <div class="flex items-center gap-3 max-w-md mx-auto my-6">
                <span class="login-divider"></span>
                <span class="text-sm text-gray-500 dark:text-[#8aa37c]">or</span>
                <span class="login-divider"></span>
              </div>

              <h3 class="text-xl mb-3 text-gray-900 dark:text-[#f5f5f5]">Sign in with email</h3>
        <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
            <div class="form-group">
                <label class="text-green-900 dark:text-[#c5d4b8]">Email</label>
                <Field
                    name="username"
                    type="text"
                    class="form-control bg-white text-gray-900 placeholder-gray-500 border-gray-300 dark:!bg-[#344a34] dark:!border-[#3d4d36] dark:!text-[#f5f5f5] dark:placeholder-[#a3b89e] focus:dark:!border-custom-green"
                    :class="{ 'is-invalid': errors.username }"
                />
                <div class="invalid-feedback">{{errors.username}}</div>
            </div>            
            <div class="form-group">
                <label class="text-green-900 dark:text-[#c5d4b8]">Password</label>
                <Field
                    name="password"
                    type="password"
                    class="form-control bg-white text-gray-900 placeholder-gray-500 border-gray-300 dark:!bg-[#344a34] dark:!border-[#3d4d36] dark:!text-[#f5f5f5] dark:placeholder-[#a3b89e] focus:dark:!border-custom-green"
                    :class="{ 'is-invalid': errors.password }"
                />
                <div class="invalid-feedback">{{errors.password}}</div>
            </div>            
            <div class="form-group">
                <button class="hover:underline text-slate-50 btn btn-primary bg-custom-green hover:bg-custom-green border-white" :disabled="isSubmitting">
                    <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
                    Login
                </button>
            </div>
            <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0 login-api-error">{{errors.apiError}}</div>
        </Form>
        <div><button type="button" @click="openRegisterModal" class="hover:underline text-green-700 hover:text-green-900 dark:text-[#8aa37c] dark:hover:text-[#c5d4b8] bg-none border-none cursor-pointer p-0">Register</button></div>
    </div>

    <!-- Phone Registration Modal -->
    <PhoneRegistration :isOpen="showRegisterModal" @close="closeRegisterModal" />
</template>

<style>
  label {
    font-weight: bold;
    font-size: 1.1em;
  }
  .stew {
    max-width: 60rem;
    margin: 0 auto;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  html.dark .stew {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 10px 10px -5px rgba(0, 0, 0, 0.22);
  }

  html.dark .login-api-error.alert-danger {
    background-color: rgba(127, 29, 29, 0.35);
    border-color: rgba(248, 113, 113, 0.45);
    color: #fecaca;
  }

  /* Bootstrap .form-control defaults can beat utilities; enforce green inputs on login in dark mode */
  html.dark .stew .form-control:not(.is-invalid) {
    background-color: #344a34 !important;
    border-color: #3d4d36 !important;
    color: #f5f5f5 !important;
    -webkit-text-fill-color: #f5f5f5;
    caret-color: #f5f5f5;
  }

  /* Chrome autofill uses its own background; without this, caret/text can stay light on pale autofill. */
  html.dark .stew .form-control:not(.is-invalid):-webkit-autofill,
  html.dark .stew .form-control:not(.is-invalid):-webkit-autofill:hover,
  html.dark .stew .form-control:not(.is-invalid):-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #344a34 inset !important;
    -webkit-text-fill-color: #f5f5f5 !important;
    caret-color: #f5f5f5 !important;
    border-color: #3d4d36 !important;
  }

  html.dark .stew .form-control:not(.is-invalid)::placeholder {
    color: #a3b89e !important;
  }

  html.dark .stew .form-control:not(.is-invalid):focus {
    border-color: #8aa37c !important;
    box-shadow: 0 0 0 1px rgba(138, 163, 124, 0.45);
  }

  html.dark .stew .form-control.is-invalid {
    border-color: #dc2626 !important;
    background-color: #442222 !important;
    color: #fecaca !important;
    -webkit-text-fill-color: #fecaca;
    caret-color: #fecaca;
  }

  html.dark .stew .form-control.is-invalid:-webkit-autofill,
  html.dark .stew .form-control.is-invalid:-webkit-autofill:hover,
  html.dark .stew .form-control.is-invalid:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #442222 inset !important;
    -webkit-text-fill-color: #fecaca !important;
    caret-color: #fecaca !important;
    border-color: #dc2626 !important;
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
    .login-phone-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.9rem 1.25rem;
      border-radius: 0.6rem;
      border: none;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.1rem;
      color: #14250f;
      background: linear-gradient(135deg, #6bb57a 0%, #47965f 55%, #2f7a4b 100%);
      transition: filter 0.15s ease, transform 0.1s ease;
    }
    .login-phone-btn:hover {
      filter: brightness(1.05);
      transform: translateY(-1px);
    }
    .login-phone-icon {
      width: 1.3rem;
      height: 1.3rem;
      flex-shrink: 0;
    }
    .login-phone-sub {
      text-align: center;
      font-size: 0.85rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }
    html.dark .login-phone-sub {
      color: #a3b89e;
    }
    .login-divider {
      flex: 1;
      height: 1px;
      background-color: #d1d5db;
    }
    html.dark .login-divider {
      background-color: #3d4d36;
    }
  @media (max-width: 640px) {
  .stew {
    padding: 0;
  }
}
</style>