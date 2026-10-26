<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores';
import { browserSecret, participationRequest } from '@/helpers/participation';

const RESEND_SECONDS = 60;
const GENERIC_SEND_ERROR = "Couldn't send a code. Try again or use email & password.";
const INVALID_CODE_ERROR = 'That code is invalid or expired.';

const auth = useAuthStore();

const step = ref('email_login');
const loginTitle = computed(() => ({ phone: 'Sign in with your phone', code: 'Enter your code', email: 'Sign in with email', email_login: 'Welcome back.', email_verify: 'Check your email.' })[step.value]);
const emailCode = ref('');
const emailProofId = ref(null);
const emailBrowserSecret = browserSecret();
const emailInputRequest = ref(null);
const emailVerifyRequest = ref(null);
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
const dialogElement = ref(null);
let opener = null;
let generation = 0;
const loginEpoch = () => ({ generation, token: auth.auth.accessToken });
const isCurrentLogin = epoch => epoch.generation === generation && epoch.token === auth.auth.accessToken;

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

watch(step, () => { generation++; isSubmitting.value = false; focusStep(); });
watch(() => auth.auth.accessToken, () => { generation++; isSubmitting.value = false; });

const sendErrorMessage = (err) => (err && err.status === 400 && err.message ? err.message : GENERIC_SEND_ERROR);

const submitPhone = async () => {
    if (!isValidPhone.value) return;
    isSubmitting.value = true;
    error.value = '';
    const epoch = loginEpoch();
    try {
            await auth.requestSmsCode(phoneDigits.value);
            if (!isCurrentLogin(epoch)) return;
            step.value = 'code';
            clearDigits();
            startCountdown();
        } catch (err) {
            if (isCurrentLogin(epoch)) error.value = sendErrorMessage(err);
        } finally {
            if (isCurrentLogin(epoch)) isSubmitting.value = false;
        }
    };

const resend = async () => {
    if (resendRemaining.value > 0 || isSubmitting.value) return;
    const epoch = loginEpoch();
    isSubmitting.value = true;
    try {
        await auth.requestSmsCode(phoneDigits.value);
        if (!isCurrentLogin(epoch)) return;
        info.value = 'New code sent.';
        error.value = '';
        startCountdown();
    } catch (err) {
        if (isCurrentLogin(epoch)) error.value = sendErrorMessage(err);
    } finally { if (isCurrentLogin(epoch)) isSubmitting.value = false; }
};

const submitCode = async () => {
    if (!isCodeComplete.value) return;
    isSubmitting.value = true;
    error.value = '';
    const epoch = loginEpoch();
    try {
        const result = await participationRequest(import.meta.env.VITE_API_URL, '/auth/sms-login/verify', { method: 'POST', body: { phoneNumber: phoneDigits.value, code: codeDigits.value } });
        if (!isCurrentLogin(epoch)) return;
        auth.setSession(result.jwt, result.user);
        auth.finishModalLogin();
    } catch {
        if (!isCurrentLogin(epoch)) return;
        error.value = INVALID_CODE_ERROR;
        clearDigits();
        digitRefs[0]?.focus();
    } finally {
        if (isCurrentLogin(epoch)) isSubmitting.value = false;
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
    const epoch = loginEpoch();
    try {
        const result = await participationRequest(import.meta.env.VITE_API_URL, '/auth/local?populate=role', { method: 'POST', body: { identifier: email.value, password: password.value } });
        if (!isCurrentLogin(epoch)) return;
        auth.setSession(result.jwt, result.user);
        auth.finishModalLogin();
    } catch (err) {
        if (!isCurrentLogin(epoch)) return;
        error.value = (err && err.message) || (typeof err === 'string' ? err : 'Login failed. Check your email and password.');
    } finally {
        if (isCurrentLogin(epoch)) isSubmitting.value = false;
    }
};

const requestEmailCode = async () => {
    if (isSubmitting.value) return;
    if (!emailInputRequest.value || emailInputRequest.value.emailRaw !== email.value) emailInputRequest.value = { requestId: crypto.randomUUID(), emailRaw: email.value, browserSecret: emailBrowserSecret };
    isSubmitting.value = true; error.value = '';
    const epoch = loginEpoch();
    try {
        const result = await participationRequest(import.meta.env.VITE_API_URL, '/auth/email-login/request', { method: 'POST', body: emailInputRequest.value });
        if (!isCurrentLogin(epoch)) return;
        emailProofId.value = result.data.proofId; emailCode.value = ''; emailVerifyRequest.value = null;
        step.value = 'email_verify'; startCountdown();
    } catch (failure) { if (isCurrentLogin(epoch)) error.value = failure.message; }
    finally { if (isCurrentLogin(epoch)) isSubmitting.value = false; }
};
const submitEmailCode = async () => {
    if (isSubmitting.value || !/^\d{8}$/.test(emailCode.value)) return;
    const prior = emailVerifyRequest.value;
    if (!prior || prior.code !== emailCode.value || prior.proofId !== emailProofId.value) emailVerifyRequest.value = { requestId: crypto.randomUUID(), proofId: emailProofId.value, browserSecret: emailBrowserSecret, code: emailCode.value };
    isSubmitting.value = true; error.value = '';
    const epoch = loginEpoch();
    try {
        const result = await participationRequest(import.meta.env.VITE_API_URL, '/auth/email-login/verify', { method: 'POST', body: emailVerifyRequest.value });
        if (!isCurrentLogin(epoch)) return;
        auth.setSession(result.data.session.jwt, result.data.session.user); auth.finishModalLogin();
    } catch (failure) { if (isCurrentLogin(epoch)) error.value = failure.message; }
    finally { if (isCurrentLogin(epoch)) isSubmitting.value = false; }
};
const resendEmailCode = () => {
    if (resendRemaining.value || isSubmitting.value) return;
    emailInputRequest.value = null; requestEmailCode();
};

const close = () => {
    generation++;
    auth.closeLoginModal();
};

const onKeydown = (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
    }
    if (e.key !== 'Tab') return;
    const controls = [...dialogElement.value.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) return;
    if (e.shiftKey && (document.activeElement === first || !dialogElement.value.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !dialogElement.value.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
    }
};

onMounted(() => {
    if (document.activeElement instanceof HTMLElement) opener = document.activeElement;
    focusStep();
    window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    generation++;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    window.removeEventListener('keydown', onKeydown);
    if (opener?.isConnected && opener.tabIndex >= 0 && !opener.matches(':disabled') && !opener.closest('[inert]') && opener.getClientRects().length > 0 && getComputedStyle(opener).visibility === 'visible') opener.focus();
});
</script>

<template>
    <Teleport to="#modals">
        <div class="login-modal-wrapper">
            <div class="login-modal-backdrop" @click="close"></div>

            <div class="login-modal-positioner" @click="close">
                <div
                    ref="dialogElement"
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
                                            {{ loginTitle }}
                                        </h2>

                    <form v-if="step === 'email_login'" @submit.prevent="requestEmailCode">
                        <p class="login-modal-subtitle">Use the email you verified with Garden Steward.</p>
                        <label for="login-code-email" class="login-modal-label">Email</label>
                        <input id="login-code-email" ref="emailInput" v-model="email" type="text" inputmode="email" autocomplete="email" maxlength="320" class="login-modal-input">
                        <p v-if="error" class="login-modal-error" role="alert">{{ error }}</p>
                        <button type="submit" class="login-modal-btn" :disabled="isSubmitting">Email me a code</button>
                        <button type="button" class="login-modal-link" @click="usePhone">Use phone instead</button>
                        <button type="button" class="login-modal-link" @click="useEmail">Use email &amp; password instead</button>
                    </form>
                    <form v-else-if="step === 'email_verify'" @submit.prevent="submitEmailCode">
                        <p class="login-modal-subtitle">If this address has a verified account, use the 8-digit code from your email.</p>
                        <label for="login-email-code" class="login-modal-label">Email code</label>
                        <input id="login-email-code" ref="emailInput" v-model="emailCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" class="login-modal-input">
                        <p v-if="error" class="login-modal-error" role="alert">{{ error }}</p>
                        <button type="submit" class="login-modal-btn" :disabled="isSubmitting || !/^\d{8}$/.test(emailCode)">Sign in</button>
                        <button type="button" class="login-modal-link" :disabled="resendRemaining > 0 || isSubmitting" @click="resendEmailCode">Resend code<span v-if="resendRemaining"> ({{ resendRemaining }}s)</span></button>
                        <button type="button" class="login-modal-link" @click="step = 'email_login'; error = ''">Use another email</button>
                    </form>
                                        <form v-else-if="step === 'phone'" @submit.prevent="submitPhone">
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
                                            <p class="login-modal-subtitle">If that number has an account, we texted a 6-digit code to</p>
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
                        <label for="login-modal-email" class="login-modal-label">Email</label>
                        <input
                            id="login-modal-email"
                            ref="emailInput"
                            type="email"
                            autocomplete="username"
                            v-model="email"
                            class="login-modal-input"
                        />
                        <label for="login-modal-password" class="login-modal-label">Password</label>
                        <input
                            id="login-modal-password"
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
    position: fixed;
    inset: 0;
    z-index: 10001;
    color: #024023;
    font: 18px/1.5 var(--gs-body-font);
}

.login-modal-backdrop {
    position: fixed;
    inset: 0;
    background: #02402366;
}

.login-modal-positioner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.login-modal-content {
    position: relative;
    width: 100%;
    max-width: 32rem;
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: clamp(22px, 4vw, 36px);
    border: 1px solid #bac5a6;
    background: #F1F2D5;
    box-shadow: 0 16px 48px #02402326;
}

.login-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 0;
    background: transparent;
    color: #024023;
    cursor: pointer;
}

.login-modal-close:hover {
    background: #e4e8cc;
}

.login-modal-close:focus-visible,
.login-modal-link:focus-visible,
.login-modal-btn:focus-visible {
    outline: 2px solid #024023;
    outline-offset: 3px;
}

.login-modal-title {
    margin: 0 28px 22px 0;
    color: #024023;
    font: 400 clamp(30px, 5vw, 38px)/1.1 var(--gs-heading-font);
}

.login-modal-subtitle {
    margin: 0 0 16px;
    color: #50634d;
    overflow-wrap: anywhere;
}

.login-modal-label {
    display: block;
    margin-bottom: 7px;
    color: #024023;
    font-size: 16px;
}

.login-modal-input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 48px;
    margin-bottom: 18px;
    padding: 10px 12px;
    border: 1px solid #92a282;
    border-radius: 0;
    background: #F1F2D5;
    color: #024023;
    font: inherit;
}

.login-modal-input::placeholder {
    color: #6a7a60;
    opacity: 1;
}

.login-modal-input:focus,
.login-otp-digit:focus {
    outline: 2px solid #024023;
    outline-offset: 2px;
}

.login-modal-info {
    margin: 10px 0;
    color: #50634d;
    font-size: 16px;
}

.login-modal-btn {
    width: 100%;
    min-height: 48px;
    margin-bottom: 16px;
    padding: 11px 16px;
    border: 1px solid #024023;
    border-radius: 0;
    background: #024023;
    color: #F1F2D5;
    font: inherit;
    cursor: pointer;
}

.login-modal-btn:hover:not(:disabled) {
    background: #0d5a35;
}

.login-modal-btn:disabled {
    border-color: #bac5a6;
    background: #e4e8cc;
    color: #65765c;
    cursor: not-allowed;
}

.login-modal-link {
    padding: 0;
    border: 0;
    background: transparent;
    color: #024023;
    font: 16px/1.5 var(--gs-body-font);
    text-align: left;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
}

.login-modal-link:disabled {
    color: #65765c;
    cursor: not-allowed;
    text-decoration: none;
}

.login-modal-error {
    margin: 0 0 16px;
    color: #a42829;
    font-size: 16px;
    overflow-wrap: anywhere;
}

.login-otp-panel {
    padding-top: 20px;
    border-top: 1px solid #bac5a6;
}

.login-otp-phone {
    margin: -8px 0 22px;
    color: #024023;
    font-size: 22px;
    overflow-wrap: anywhere;
}

.login-otp-inputs {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: clamp(6px, 2vw, 10px);
    margin-bottom: 24px;
}

.login-otp-digit {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: 56px;
    padding: 0;
    border: 1px solid #92a282;
    border-radius: 0;
    background: #F1F2D5;
    color: #024023;
    font: 26px/1 var(--gs-body-font);
    text-align: center;
}

.login-otp-digit--active {
    border-color: #024023;
}

.login-otp-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
}

.login-otp-divider {
    color: #92a282;
}

.login-otp-other {
    display: block;
    margin-top: 18px;
}
</style>
