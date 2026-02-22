<template>
  <div class="verify-container">
    <div class="verify-card">
      <!-- Loading State -->
      <div v-if="state === 'verifying'" class="state-container">
        <div class="spinner"></div>
        <h2>Verifying your email...</h2>
        <p>Please wait while we verify your email address</p>
      </div>

      <!-- Verification Failed -->
      <div v-else-if="state === 'verification-failed'" class="state-container error">
        <div class="error-icon">✗</div>
        <h2>Verification Failed</h2>
        <p v-if="errorStatus" class="error-status">{{ errorStatus }}</p>
        <p>{{ errorMessage }}</p>

        <div class="resend-section">
          <p v-if="resendSuccess" class="resend-sent">✓ Verification email sent to <strong>{{ resendMaskedEmail }}</strong>. Check your inbox.</p>
          <p class="resend-label">Enter your phone number to resend a new verification link:</p>
          <form @submit.prevent="resendVerification">
            <div class="form-group">
              <input
                :value="resendPhone"
                type="tel"
                placeholder="(555) 123-4567"
                required
                :disabled="resendCooldown > 0"
                @input="handleResendPhoneInput"
                class="resend-input"
              />
            </div>
            <div v-if="resendError" class="error-message">
              <span v-if="resendErrorStatus" class="resend-error-status">{{ resendErrorStatus }} — </span>{{ resendError }}
            </div>
            <button type="submit" :disabled="resendLoading || resendCooldown > 0" class="btn-resend">
              <template v-if="resendLoading">Sending...</template>
              <template v-else-if="resendCooldown > 0">Resend available in {{ resendCooldown }}s</template>
              <template v-else>Resend Verification Email</template>
            </button>
          </form>
        </div>

        <router-link to="/login" class="btn-secondary-link">Back to Login</router-link>
      </div>

      <!-- Password Creation -->
      <div v-else-if="state === 'create-password'" class="state-container">
        <h2>Create Your Password</h2>
        <p class="subtitle">Set a secure password for your Garden Steward account</p>

        <form @submit.prevent="submitPassword">
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="At least 8 characters"
              required
              minlength="8"
              @input="clearError"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              required
              minlength="8"
              @input="clearError"
            />
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>

          <button type="submit" :disabled="isLoading" class="btn-primary">
            {{ isLoading ? 'Setting password...' : 'Create Password' }}
          </button>
        </form>
      </div>

      <!-- Success State -->
      <div v-else-if="state === 'success'" class="state-container success">
        <div class="success-icon">✓</div>
        <h2>Password Created!</h2>
        <p>Your account is ready. You can now log in with your email and password.</p>
        <router-link to="/login" class="btn-primary">Go to Login</router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VerifyEmail',
  data() {
    return {
      state: 'verifying', // verifying, verification-failed, create-password, success
      password: '',
      confirmPassword: '',
      error: '',
      errorMessage: '',
      errorStatus: null,
      isLoading: false,
      userId: null,
      token: null,
      resendPhone: '',
      resendLoading: false,
      resendError: '',
      resendErrorStatus: null,
      resendSuccess: false,
      resendMaskedEmail: '',
      resendCooldown: 0,
      resendTimer: null
    };
  },
  mounted() {
    this.extractParams();
    this.verifyEmail();
  },
  beforeUnmount() {
    if (this.resendTimer) clearInterval(this.resendTimer);
  },
  methods: {
    extractParams() {
      const params = new URLSearchParams(window.location.search);
      this.token = params.get('token');
      this.userId = params.get('userId');

      if (!this.token || !this.userId) {
        this.state = 'verification-failed';
        this.errorMessage = 'Invalid verification link. Please try registering again.';
      }
    },

    async verifyEmail() {
      if (!this.token || !this.userId) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: this.token,
            userId: this.userId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          this.state = 'verification-failed';
          this.errorStatus = data.error?.status || response.status;
          this.errorMessage = data.error?.message || 'Email verification failed. Please try again.';
          return;
        }

        // Success - move to password creation
        this.state = 'create-password';
      } catch (err) {
        this.state = 'verification-failed';
        this.errorMessage = 'Unable to verify email. Please check your internet connection.';
        console.error('Verification error:', err);
      }
    },

    async submitPassword() {
      this.error = '';

      // Validation
      if (this.password.length < 8) {
        this.error = 'Password must be at least 8 characters long';
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }

      this.isLoading = true;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/set-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: this.userId,
            password: this.password,
            confirmPassword: this.confirmPassword
          })
        });

        const data = await response.json();

        if (!response.ok) {
          this.error = data.error?.message || 'Failed to set password. Please try again.';
          return;
        }

        // Success!
        this.state = 'success';

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.$router.push('/login');
        }, 2000);
      } catch (err) {
        this.error = 'Unable to set password. Please check your internet and try again.';
        console.error('Password set error:', err);
      } finally {
        this.isLoading = false;
      }
    },

    clearError() {
      this.error = '';
    },

    formatPhoneNumber(value) {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    },

    handleResendPhoneInput(event) {
      this.resendPhone = this.formatPhoneNumber(event.target.value);
      this.resendError = '';
    },

    async resendVerification() {
      this.resendError = '';
      this.resendErrorStatus = null;
      this.resendLoading = true;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/phone-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: this.resendPhone.replace(/\D/g, '') })
        });
        const data = await response.json();
        if (!response.ok) {
          this.resendErrorStatus = data.error?.status || response.status;
          this.resendError = data.error?.message || 'Failed to resend. Please try again.';
          return;
        }
        this.resendMaskedEmail = data.email || '';
        this.resendSuccess = true;
        this.resendCooldown = 60;
        this.resendTimer = setInterval(() => {
          this.resendCooldown--;
          if (this.resendCooldown <= 0) {
            clearInterval(this.resendTimer);
            this.resendTimer = null;
          }
        }, 1000);
      } catch (err) {
        this.resendError = 'Unable to connect. Please check your internet and try again.';
      } finally {
        this.resendLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.verify-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 20px;
}

.verify-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 40px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.state-container {
  text-align: center;
}

h2 {
  font-size: 1.5rem;
  color: #e4e4e4;
  margin-bottom: 12px;
}

.subtitle {
  color: #9ca3af;
  margin-bottom: 24px;
  font-size: 0.95rem;
}

p {
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 24px;
}

.spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 24px;
  border: 4px solid rgba(138, 163, 124, 0.2);
  border-top: 4px solid #8aa37c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon,
.success-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  font-weight: bold;
}

.error-icon {
  color: #ef4444;
}

.success-icon {
  color: #4ade80;
}

.error {
  color: #ef4444;
}

.error-status {
  font-size: 0.8rem;
  font-weight: 600;
  color: #ef4444;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.resend-section {
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  text-align: left;
}

.resend-label {
  font-size: 0.85rem;
  color: #9ca3af;
  margin-bottom: 12px;
}

.resend-input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  color: #e4e4e4;
  font-size: 1rem;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.resend-input:focus {
  outline: none;
  border-color: #4ade80;
  background: rgba(255, 255, 255, 0.08);
}

.btn-resend {
  width: 100%;
  padding: 10px;
  background: rgba(138, 163, 124, 0.2);
  color: #8aa37c;
  border: 1px solid rgba(138, 163, 124, 0.4);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-resend:hover:not(:disabled) {
  background: rgba(138, 163, 124, 0.35);
}

.btn-resend:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.resend-confirmation {
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
}

.resend-sent {
  color: #4ade80;
  font-weight: 500;
  margin-bottom: 0;
}

.resend-error-status {
  font-weight: 700;
}

.btn-secondary-link {
  display: inline-block;
  margin-top: 20px;
  color: #9ca3af;
  font-size: 0.85rem;
  text-decoration: underline;
}

.btn-secondary-link:hover {
  color: #e4e4e4;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

label {
  display: block;
  font-size: 0.85rem;
  color: #9ca3af;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  color: #e4e4e4;
  font-size: 1rem;
  box-sizing: border-box;
  transition: all 0.2s;
}

input:focus {
  outline: none;
  border-color: #4ade80;
  background: rgba(255, 255, 255, 0.08);
}

input::placeholder {
  color: #6b7280;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
  color: #fca5a5;
  padding: 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 16px;
  text-align: left;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #8aa37c;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
  box-sizing: border-box;
}

.btn-primary:hover:not(:disabled) {
  background: #6c8a6a;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
