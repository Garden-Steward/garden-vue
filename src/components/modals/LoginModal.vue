<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores';

const RESEND_SECONDS = 60;
const GENERIC_SEND_ERROR = "Couldn't send a code. Try again or use email & password.";
const INVALID_CODE_ERROR = 'That code is invalid or expired.';

const auth = useAuthStore();

const step = ref('phone'); // 'phone' | 'code' | 'email'
const phoneDisplay = ref('');
const code = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const info = ref('');
const isSubmitting = ref(false);
const resendRemaining = ref(0);

const phoneInput = ref(null);
const codeInput = ref(null);
const emailInput = ref(null);

const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '').slice(0, 10);

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
        return digits;
    } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
};

const phoneDigits = computed(() => phoneDisplay.value.replace(/\D/g, ''));
const isValidPhone = computed(() => phoneDigits.value.length === 10);

let timer = null;
const startCountdown = () => {
    resendRemaining.value = RESEND_SECONDS;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    timer = setInterval(() => {
        resendRemaining.value -= 1;
        if (resendRemaining.value <= 0) {
            resendRemaining.value = 0;
            clearInterval(timer);
            timer = null;
        }
    }, 1000);
};

const focusStep = async () => {
    await nextTick();
    if (step.value === 'phone') {
        phoneInput.value?.focus();
    } else if (step.value === 'code') {
        codeInput.value?.focus();
    } else {
        emailInput.value?.focus();
    }
};

watch(step, focusStep);

const sendErrorMessage = (err) => (err && err.status === 400 && err.message ? err.message : GENERIC_SEND_ERROR);

const submitPhone = async () => {
    if (!isValidPhone.value) return;
    isSubmitting.value = true;
    error.value = '';
    try {
        await auth.requestSmsCode(phoneDigits.value);
        step.value = 'code';
        code.value = '';
        startCountdown();
    } catch (err) {
        error.value = sendErrorMessage(err);
    } finally {
        isSubmitting.value = false;
    }
};

const resend = async () => {
    if (resendRemaining.value > 0 || isSubmitting.value) return;
    try {
        await auth.requestSmsCode(phoneDigits.value);
        info.value = 'New code sent.';
        error.value = '';
        startCountdown();
    } catch (err) {
        error.value = sendErrorMessage(err);
    }
};

const submitCode = async () => {
    if (!/^\d{6}$/.test(code.value)) return;
    isSubmitting.value = true;
    error.value = '';
    try {
        await auth.verifySmsCode(phoneDigits.value, code.value);
        auth.finishModalLogin();
    } catch {
        error.value = INVALID_CODE_ERROR;
        code.value = '';
        focusStep();
    } finally {
        isSubmitting.value = false;
    }
};

const onCodeInput = (e) => {
    code.value = e.target.value.replace(/\D/g, '').slice(0, 6);
};

const useDifferentNumber = () => {
    step.value = 'phone';
    error.value = '';
    info.value = '';
    code.value = '';
};

const useEmail = () => {
    step.value = 'email';
    error.value = '';
    info.value = '';
};

const usePhone = () => {
    step.value = 'phone';
    error.value = '';
    info.value = '';
};

const submitEmail = async () => {
    if (!email.value || !password.value) return;
    isSubmitting.value = true;
    error.value = '';
    try {
        await auth.login(email.value, password.value, { redirect: false });
        auth.finishModalLogin();
    } catch (err) {
        error.value = (err && err.message) || (typeof err === 'string' ? err : 'Login failed. Check your email and password.');
    } finally {
        isSubmitting.value = false;
    }
};

const close = () => {
    auth.closeLoginModal();
};

const onKeydown = (e) => {
    if (e.key === 'Escape') close();
};

onMounted(() => {
    focusStep();
    window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <Teleport to="#modals">
        <div class="login-modal-wrapper">
            <div class="login-modal-backdrop" @click="close"></div>

            <div class="fixed inset-0 flex items-center justify-center p-4" @click="close">
                <div
                    class="login-modal-content"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="login-modal-title"
                    @click.stop
                >
                    <button type="button" class="login-modal-close" aria-label="Close" @click="close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <h2 id="login-modal-title" class="login-modal-title">Log in to continue</h2>

                    <form v-if="step === 'phone'" @submit.prevent="submitPhone">
                        <label for="login-modal-phone" class="login-modal-label">Phone number</label>
                        <input
                            id="login-modal-phone"
                            ref="phoneInput"
                            type="tel"
                            autocomplete="tel"
                            :value="phoneDisplay"
                            @input="phoneDisplay = formatPhoneNumber($event.target.value)"
                            placeholder="(555) 555-5555"
                            class="login-modal-input"
                        />
                        <p v-if="error" class="login-modal-error">{{ error }}</p>
                        <button type="submit" class="login-modal-btn" :disabled="!isValidPhone || isSubmitting">
                            {{ isSubmitting ? 'Sending...' : 'Text me a code' }}
                        </button>
                        <button type="button" class="login-modal-link" @click="useEmail">Use email &amp; password instead</button>
                    </form>

                    <div v-else-if="step === 'code'">
                        <p class="login-modal-subtitle">If that number has an account, we texted a code.</p>
                        <p>
                            Sent to {{ phoneDisplay }}
                            <button type="button" class="login-modal-link" @click="useDifferentNumber">Use a different number</button>
                        </p>
                        <form @submit.prevent="submitCode">
                            <input
                                id="login-modal-code"
                                ref="codeInput"
                                type="text"
                                inputmode="numeric"
                                autocomplete="one-time-code"
                                maxlength="6"
                                pattern="\d{6}"
                                :value="code"
                                @input="onCodeInput"
                                class="login-modal-input"
                                placeholder="123456"
                            />
                            <p v-if="error" class="login-modal-error">{{ error }}</p>
                            <p v-if="info" class="login-modal-info">{{ info }}</p>
                            <button type="submit" class="login-modal-btn" :disabled="code.length !== 6 || isSubmitting">Verify</button>
                            <button
                                type="button"
                                class="login-modal-link"
                                :disabled="resendRemaining > 0 || isSubmitting"
                                @click="resend"
                            >
                                {{ resendRemaining > 0 ? `Resend in ${resendRemaining}s` : 'Resend code' }}
                            </button>
                            <button type="button" class="login-modal-link" @click="useEmail">Use email &amp; password instead</button>
                        </form>
                    </div>

                    <form v-else @submit.prevent="submitEmail">
                        <input
                            ref="emailInput"
                            type="email"
                            autocomplete="username"
                            v-model="email"
                            class="login-modal-input"
                        />
                        <input
                            type="password"
                            autocomplete="current-password"
                            v-model="password"
                            class="login-modal-input"
                        />
                        <p v-if="error" class="login-modal-error">{{ error }}</p>
                        <button type="submit" class="login-modal-btn" :disabled="isSubmitting">Log in</button>
                        <button type="button" class="login-modal-link" @click="usePhone">Use a text code instead</button>
                    </form>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.login-modal-wrapper {
    z-index: 10001;
}

.login-modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(17, 24, 39, 0.5);
    transition: background-color 0.3s ease;
}

.login-modal-content {
    background-color: #ffffff;
    color: #111827;
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 28rem;
    width: 100%;
    padding: 1.5rem;
    position: relative;
    transition: all 0.3s ease;
}

.login-modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    color: #9ca3af;
    transition: color 0.2s;
}
.login-modal-close:hover {
    color: #4b5563;
}

.login-modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1rem;
}

.login-modal-subtitle {
    color: #4b5563;
    margin-top: 0.5rem;
}

.login-modal-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
}

.login-modal-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #111827;
    font-size: 1.125rem;
    transition: all 0.2s;
    margin-bottom: 0.75rem;
}
.login-modal-input::placeholder {
    color: #9ca3af;
}
.login-modal-input:focus {
    outline: none;
    border-color: transparent;
    box-shadow: 0 0 0 2px #22c55e;
}

.login-modal-info {
    font-size: 0.875rem;
    color: #6b7280;
}

.login-modal-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    color: #ffffff;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    background-color: #16a34a;
    margin-bottom: 0.5rem;
}
.login-modal-btn:hover:not(:disabled) {
    background-color: #15803d;
}
.login-modal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.login-modal-link {
    color: #16a34a;
    text-decoration: underline;
    font-size: 0.875rem;
    background: none;
    border: none;
    cursor: pointer;
}
.login-modal-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
}

.login-modal-error {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #dc2626;
}
</style>

<style>
html.dark .login-modal-backdrop { background-color: rgba(0,0,0,0.8) !important; }
html.dark .login-modal-content { background-color: #2d3e26 !important; color: #f5f5f5 !important; border: 1px solid #3d4d36 !important; }
html.dark .login-modal-title, html.dark .login-modal-label { color: #f5f5f5 !important; }
html.dark .login-modal-subtitle, html.dark .login-modal-info { color: #d0d0d0 !important; }
html.dark .login-modal-input { background-color: #344a34 !important; border-color: #3d4d36 !important; color: #f5f5f5 !important; }
html.dark .login-modal-input::placeholder { color: #a8b89e !important; }
html.dark .login-modal-input:focus { box-shadow: 0 0 0 2px #8aa37c !important; }
html.dark .login-modal-input:-webkit-autofill,
html.dark .login-modal-input:-webkit-autofill:hover,
html.dark .login-modal-input:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 1000px #344a34 inset !important; -webkit-text-fill-color: #f5f5f5 !important; caret-color: #f5f5f5; }
html.dark .login-modal-btn { background-color: #8aa37c !important; }
html.dark .login-modal-btn:hover:not(:disabled) { background-color: #6b8560 !important; }
html.dark .login-modal-link { color: #8aa37c !important; }
html.dark .login-modal-error { color: #f87171 !important; }
html.dark .login-modal-close:hover { color: #f5f5f5 !important; }
</style>
