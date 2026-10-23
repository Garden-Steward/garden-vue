<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores';

const RESEND_SECONDS = 60;
const GENERIC_SEND_ERROR = "Couldn't send a code. Try again or use email & password.";
const INVALID_CODE_ERROR = 'That code is invalid or expired.';

const auth = useAuthStore();

const step = ref('phone'); // 'phone' | 'code' | 'email'
const phoneDisplay = ref('');
const digits = ref(['', '', '', '', '', '']);
const digitRefs = [];
const email = ref('');
const password = ref('');
const error = ref('');
const info = ref('');
const isSubmitting = ref(false);
const resendRemaining = ref(0);

const phoneInput = ref(null);
const emailInput = ref(null);

const codeDigits = computed(() => digits.value.join(''));
const isCodeComplete = computed(() => /^\d{6}$/.test(codeDigits.value));
const clearDigits = () => { digits.value = ['', '', '', '', '', '']; };

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
        digitRefs[0]?.focus();
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
            clearDigits();
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
    if (!isCodeComplete.value) return;
    isSubmitting.value = true;
    error.value = '';
    try {
        await auth.verifySmsCode(phoneDigits.value, codeDigits.value);
        auth.finishModalLogin();
    } catch {
        error.value = INVALID_CODE_ERROR;
        clearDigits();
        digitRefs[0]?.focus();
    } finally {
        isSubmitting.value = false;
    }
};

const handleDigitInput = (index, event) => {
    const el = event.target;
    const val = (el.value || '').replace(/\D/g, '');
    if (!val) {
        digits.value[index] = '';
        return;
    }
    const last = val.slice(-1);
    digits.value[index] = last;
    el.value = last;
    if (index < 5) digitRefs[index + 1]?.focus();
};

const handleDigitKeydown = (index, event) => {
    if (event.key === 'Backspace') {
        event.preventDefault();
        if (digits.value[index]) {
            digits.value[index] = '';
        } else if (index > 0) {
            digits.value[index - 1] = '';
            digitRefs[index - 1]?.focus();
        }
    } else if (event.key === 'ArrowLeft' && index > 0) {
        digitRefs[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
        digitRefs[index + 1]?.focus();
    }
};

const handleDigitPaste = (event) => {
    const text = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    event.preventDefault();
    for (let i = 0; i < 6; i++) digits.value[i] = text[i] || '';
    const next = Math.min(text.length, 5);
    digitRefs[next]?.focus();
};

// Auto-submit the moment all six digits are filled.
watch(isCodeComplete, (complete) => {
    if (complete && !isSubmitting.value) submitCode();
});

const useDifferentNumber = () => {
    step.value = 'phone';
    error.value = '';
    info.value = '';
    clearDigits();
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

                    <h2 id="login-modal-title" class="login-modal-title">
                                            {{ step === 'code' ? 'Enter your code' : step === 'email' ? 'Sign in with email' : 'Sign in with your phone' }}
                                        </h2>

                                        <form v-if="step === 'phone'" @submit.prevent="submitPhone">
                                            <p class="login-modal-subtitle login-modal-subtitle--lead">
                                                We'll text you a 6-digit code to sign you in. No password needed.
                                            </p>
                                            <label for="login-modal-phone" class="login-modal-label">Phone number</label>
                                            <input
                                                id="login-modal-phone"
                                                ref="phoneInput"
                                                type="tel"
                                                autocomplete="tel"
                                                :value="phoneDisplay"
                                                @input="phoneDisplay = formatPhoneNumber($event.target.value)"
                                                placeholder="(555) 555-5555"
                                                class="login-modal-input login-modal-input--phone"
                                            />
                                            <p v-if="error" class="login-modal-error">{{ error }}</p>
                                            <button type="submit" class="login-modal-btn" :disabled="!isValidPhone || isSubmitting">
                                                {{ isSubmitting ? 'Sending...' : 'Text me a code' }}
                                            </button>
                                            <button type="button" class="login-modal-link" @click="useEmail">Use email &amp; password instead</button>
                                        </form>

                    <div v-else-if="step === 'code'" class="login-otp-panel">
                                            <p class="login-modal-subtitle">We texted a 6-digit code to</p>
                                            <p class="login-otp-phone">{{ phoneDisplay }}</p>

                                            <form @submit.prevent="submitCode">
                                                <div class="login-otp-inputs" aria-label="6-digit code">
                                                    <input
                                                        v-for="(digit, i) in digits"
                                                        :key="i"
                                                        :ref="el => { if (el) digitRefs[i] = el; }"
                                                        type="text"
                                                        inputmode="numeric"
                                                        autocomplete="one-time-code"
                                                        maxlength="1"
                                                        class="login-otp-digit"
                                                        :class="{ 'login-otp-digit--active': i === digits.findIndex(d => d === '') && !isCodeComplete }"
                                                        :value="digit"
                                                        @input="handleDigitInput(i, $event)"
                                                        @keydown="handleDigitKeydown(i, $event)"
                                                        @paste="handleDigitPaste"
                                                    />
                                                </div>
                                                <p v-if="error" class="login-modal-error">{{ error }}</p>
                                                <p v-if="info" class="login-modal-info">{{ info }}</p>
                                                <button type="submit" class="login-modal-btn" :disabled="!isCodeComplete || isSubmitting">
                                                    {{ isSubmitting ? 'Verifying...' : 'Verify' }}
                                                </button>
                                                <div class="login-otp-actions">
                                                    <button
                                                        type="button"
                                                        class="login-modal-link"
                                                        :disabled="resendRemaining > 0 || isSubmitting"
                                                        @click="resend"
                                                    >
                                                        {{ resendRemaining > 0 ? `Resend in ${resendRemaining}s` : 'Resend code' }}
                                                    </button>
                                                    <span class="login-otp-divider">·</span>
                                                    <button type="button" class="login-modal-link" @click="useDifferentNumber">Use a different number</button>
                                                </div>
                                                <button type="button" class="login-modal-link login-otp-other" @click="useEmail">Try another way</button>
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

.login-modal-subtitle--lead {
    font-size: 0.95rem;
    line-height: 1.45;
    margin-top: 0;
    margin-bottom: 1.1rem;
}

/* ── OTP code step ── */
.login-otp-panel {
    position: relative;
    margin: 0.25rem 0 0;
    padding: 1.6rem 1.25rem 1.25rem;
    border-radius: 0.9rem;
    text-align: center;
    overflow: hidden;
    background: linear-gradient(135deg, #14371f 0%, #1f5133 28%, #2f7a4b 55%, #47965f 78%, #6bb57a 100%);
}
.login-otp-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse at 15% 15%, rgba(255, 214, 102, 0.38), transparent 50%),
        radial-gradient(ellipse at 85% 85%, rgba(95, 205, 160, 0.45), transparent 55%),
        radial-gradient(ellipse at 70% 10%, rgba(64, 155, 122, 0.5), transparent 45%);
    pointer-events: none;
}
.login-otp-panel .login-modal-subtitle {
    position: relative;
    margin-top: 0;
    color: rgba(255, 255, 255, 0.92);
}
.login-otp-phone {
    position: relative;
    font-size: 1.4rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0.25rem 0 1.5rem;
    letter-spacing: 0.03em;
}
.login-otp-inputs {
    position: relative;
    display: flex;
    gap: 0.55rem;
    justify-content: center;
    margin-bottom: 1.25rem;
}
.login-otp-digit {
    width: 2.75rem;
    height: 3.3rem;
    text-align: center;
    font-size: 1.55rem;
    font-weight: 700;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.14);
    border: 2px solid rgba(255, 255, 255, 0.45);
    border-radius: 0.6rem;
    padding: 0;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.login-otp-digit:focus {
    outline: none;
    border-color: #ffffff;
    background: rgba(255, 255, 255, 0.28);
}
.login-otp-digit--active {
    border-color: #ffd76a;
    box-shadow: 0 0 0 3px rgba(255, 215, 106, 0.28);
}
.login-otp-actions {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    margin-top: 0.35rem;
}
.login-otp-divider {
    color: rgba(255, 255, 255, 0.45);
}
.login-otp-other {
    display: block;
    position: relative;
    margin-top: 1rem;
}
.login-otp-panel .login-modal-link { color: #ffe9b3; }
.login-otp-panel .login-modal-link:disabled { color: rgba(255, 255, 255, 0.4); }
.login-otp-panel .login-modal-btn {
    position: relative;
    background-color: #ffffff;
    color: #1f4037;
}
.login-otp-panel .login-modal-btn:hover:not(:disabled) { background-color: #f0fdf4; }
.login-otp-panel .login-modal-error { color: #ffd6d6; }
.login-otp-panel .login-modal-info { color: rgba(255, 255, 255, 0.9); }
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
