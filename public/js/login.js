// Sign In Page Logic Module

import { api } from './api.js';
import { showAlert, hideAlert, setupPasswordToggle } from './utils.js';

let pendingMfaEmail = '';

document.addEventListener('DOMContentLoaded', async () => {
  // Setup password toggle
  setupPasswordToggle('passwordInput', 'togglePassword');

  // Check if already authenticated
  const meRes = await api.getMe();
  if (meRes.success && meRes.data.user) {
    window.location.href = '/dashboard.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertContainer = document.getElementById('alertContainer');

  const mfaModal = document.getElementById('mfaModal');
  const mfaForm = document.getElementById('mfaForm');
  const mfaSubmitBtn = document.getElementById('mfaSubmitBtn');
  const mfaCodeInput = document.getElementById('mfaCodeInput');
  const mfaAlertContainer = document.getElementById('mfaAlertContainer');
  const mfaDemoHint = document.getElementById('mfaDemoHint');

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertContainer);

      const email = document.getElementById('emailInput').value.trim();
      const password = document.getElementById('passwordInput').value;

      if (!email || !password) {
        showAlert(alertContainer, 'Please fill in both email and password.');
        return;
      }

      // Disable button during loading
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Signing in...</span>
      `;

      try {
        const res = await api.login({ email, password });

        if (res.success) {
          if (res.data.mfaRequired) {
            // MFA code required
            pendingMfaEmail = email;
            if (res.data.otp) {
              mfaDemoHint.textContent = `Demo OTP Code: ${res.data.otp}`;
              mfaDemoHint.classList.remove('hidden');
            } else {
              mfaDemoHint.classList.add('hidden');
            }
            mfaModal.classList.remove('hidden');
          } else {
            // Standard login success
            showAlert(alertContainer, 'Login successful! Redirecting...', 'success');
            setTimeout(() => {
              window.location.href = '/dashboard.html';
            }, 800);
          }
        } else {
          showAlert(alertContainer, res.error || 'Failed to sign in');
        }
      } catch (err) {
        showAlert(alertContainer, 'An unexpected error occurred.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Handle MFA Code Verification Submit
  if (mfaForm) {
    mfaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(mfaAlertContainer);

      const code = mfaCodeInput.value.trim();
      if (!code || code.length !== 6) {
        showAlert(mfaAlertContainer, 'Please enter a valid 6-digit OTP code.');
        return;
      }

      mfaSubmitBtn.disabled = true;
      mfaSubmitBtn.textContent = 'Verifying...';

      try {
        const res = await api.verifyLoginOtp({ email: pendingMfaEmail, code });
        if (res.success) {
          showAlert(mfaAlertContainer, 'MFA verified! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 800);
        } else {
          showAlert(mfaAlertContainer, res.error || 'Invalid OTP code.');
        }
      } catch (err) {
        showAlert(mfaAlertContainer, 'Failed to verify MFA OTP.');
      } finally {
        mfaSubmitBtn.disabled = false;
        mfaSubmitBtn.textContent = 'Verify & Sign In';
      }
    });
  }
});
