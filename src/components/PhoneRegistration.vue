<template>
  <div class="registration-modal" v-if="isOpen" @click="closeOnBackdrop">
    <div class="modal-content" @click.stop>
      <button class="close-btn" @click="closeModal">×</button>
      
      <h2>Welcome to Garden Steward</h2>
      <p class="notice">We're currently only allowing registrations of existing garden members in our SMS outreach. If you already receive Garden Steward texts you're in the right place!</p>
      <p class="subtitle">Enter your phone number to get started</p>

      <!-- Phone Input Step -->
      <div v-if="step === 'phone'" class="form-step">
        <form @submit.prevent="submitPhone">
          <div class="form-group">
            <label for="phone">Garden Steward Phone Number</label>
            <input
              id="phone"
              :value="phoneNumber"
              type="tel"
              placeholder="(555) 123-4567"
              required
              @input="handlePhoneInput"
            />
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>

          <button type="submit" :disabled="isLoading" class="btn-primary">
            {{ isLoading ? 'Sending verification...' : 'Continue' }}
          </button>

          <p class="help-text">
            We'll send a verification link to your email address on file
          </p>
        </form>
      </div>

      <!-- Verification Sent Confirmation -->
      <div v-if="step === 'verification-sent'" class="confirmation-step">
        <div class="check-icon">✓</div>
        <h3>Verification Email Sent</h3>
        <p>We've sent a verification link to <strong>{{ maskedEmail }}</strong>. Click the link to create your password.</p>
        <button @click="closeModal" class="btn-secondary">Back to Login</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PhoneRegistration',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      step: 'phone',
      phoneNumber: '',
      maskedEmail: '',
      error: '',
      isLoading: false
    };
  },
  methods: {
    async submitPhone() {
      this.error = '';
      this.isLoading = true;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/phone-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phoneNumber: this.phoneNumber.replace(/\D/g, '')
          })
        });

        const data = await response.json();

        if (!response.ok) {
          this.error = data.error?.message || 'An error occurred. Please try again.';
          return;
        }

        // Success - show confirmation
        this.maskedEmail = data.email || '';
        this.step = 'verification-sent';
      } catch (err) {
        this.error = 'Unable to connect. Please check your internet and try again.';
        console.error('Phone signup error:', err);
      } finally {
        this.isLoading = false;
      }
    },

    formatPhoneNumber(value) {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 3) {
        return digits;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
    },

    handlePhoneInput(event) {
      this.phoneNumber = this.formatPhoneNumber(event.target.value);
      this.error = '';
    },

    clearError() {
      this.error = '';
    },

    closeOnBackdrop(e) {
      if (e.target === e.currentTarget) {
        this.closeModal();
      }
    },

    closeModal() {
      this.$emit('close');
      this.resetForm();
    },

    resetForm() {
      this.phoneNumber = '';
      this.maskedEmail = '';
      this.error = '';
      this.step = 'phone';
    }
  }
};
</script>

<style scoped>
.registration-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 40px;
  max-width: 400px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #e4e4e4;
}

h2 {
  font-size: 1.5rem;
  color: #e4e4e4;
  margin-bottom: 8px;
  text-align: center;
}

.notice {
  background: rgba(74, 222, 128, 0.08);
  border-left: 3px solid #4ade80;
  color: #9ca3af;
  padding: 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 20px;
  text-align: left;
}

.subtitle {
  color: #9ca3af;
  text-align: center;
  margin-bottom: 32px;
  font-size: 0.95rem;
}

.form-step {
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 20px;
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
}

.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #8aa37c;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #6c8a6a;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(138, 163, 124, 0.2);
  color: #8aa37c;
  margin-top: 12px;
}

.btn-secondary:hover {
  background: rgba(138, 163, 124, 0.3);
}

.help-text {
  font-size: 0.85rem;
  color: #6b7280;
  text-align: center;
  margin-top: 16px;
}

.confirmation-step {
  text-align: center;
}

.check-icon {
  font-size: 3rem;
  color: #4ade80;
  margin-bottom: 16px;
}

.confirmation-step h3 {
  font-size: 1.25rem;
  color: #e4e4e4;
  margin-bottom: 12px;
}

.confirmation-step p {
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 24px;
}
</style>
