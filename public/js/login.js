// Sign In Page Logic Module — Login & MFA Verification

import { api } from './api.js';
import { showAlert, hideAlert, setupPasswordToggle } from './utils.js';

let pendingMfaData = {
  email: '',
  challengeId: '',
  method: 'email',
};

document.addEventListener('DOMContentLoaded', async () => {
  setupPasswordToggle('passwordInput', 'togglePassword');

  // Check if user is already authenticated
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
  const mfaModalSubtext = document.getElementById('mfaModalSubtext');
  const closeMfaModalBtn = document.getElementById('closeMfaModalBtn');

  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const forgotModal = document.getElementById('forgotModal');
  const forgotForm = document.getElementById('forgotForm');
  const forgotEmailInput = document.getElementById('forgotEmailInput');
  const forgotAlertContainer = document.getElementById('forgotAlertContainer');
  const closeForgotModalBtn = document.getElementById('closeForgotModalBtn');

  // Login Form Submission
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

      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span>Signing in...</span>`;

      try {
        const res = await api.login({ email, password });

        if (res.success) {
          if (res.data.mfaRequired) {
            pendingMfaData = {
              email,
              challengeId: res.data.challengeId,
              method: res.data.method || 'email',
            };

            mfaModalSubtext.textContent = `An MFA code has been sent to ${res.data.target || email}.`;
            hideAlert(mfaAlertContainer);
            mfaCodeInput.value = '';
            mfaModal.classList.remove('hidden');
          } else {
            showAlert(alertContainer, 'Login successful! Redirecting to dashboard...', 'success');
            setTimeout(() => {
              window.location.href = '/dashboard.html';
            }, 600);
          }
        } else {
          // Handle locked out or wrong credentials status
          if (res.status === 423 || res.data?.locked) {
            showAlert(alertContainer, res.error || 'Account is temporarily locked. Try again later.', 'error');
          } else {
            showAlert(alertContainer, res.error || 'Invalid credentials.', 'error');
          }
        }
      } catch (err) {
        showAlert(alertContainer, 'An unexpected error occurred during login.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // MFA Modal Form Submission
  if (mfaForm) {
    mfaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(mfaAlertContainer);

      const code = mfaCodeInput.value.trim();
      if (!code || code.length !== 6) {
        showAlert(mfaAlertContainer, 'Please enter a valid 6-digit MFA OTP code.', 'error');
        return;
      }

      mfaSubmitBtn.disabled = true;
      mfaSubmitBtn.textContent = 'Verifying MFA...';

      try {
        const res = await api.verifyLoginOtp({
          challengeId: pendingMfaData.challengeId,
          email: pendingMfaData.email,
          code,
        });

        if (res.success) {
          showAlert(mfaAlertContainer, 'MFA verified! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 600);
        } else {
          if (res.data?.status === 'wrong_code') {
            const attemptsLeft = res.data.attemptsLeft ?? 'few';
            showAlert(mfaAlertContainer, `Wrong MFA code. (${attemptsLeft} attempt(s) remaining)`, 'error');
          } else if (res.data?.status === 'expired') {
            showAlert(mfaAlertContainer, 'MFA code expired. Please sign in again.', 'error');
          } else if (res.data?.status === 'max_attempts_exceeded') {
            showAlert(mfaAlertContainer, 'Maximum MFA attempts reached. Please sign in again.', 'error');
          } else {
            showAlert(mfaAlertContainer, res.error || 'MFA verification failed.', 'error');
          }
        }
      } catch (err) {
        showAlert(mfaAlertContainer, 'Failed to verify MFA OTP.');
      } finally {
        mfaSubmitBtn.disabled = false;
        mfaSubmitBtn.textContent = 'Verify & Sign In';
      }
    });
  }

  // Close MFA Modal
  if (closeMfaModalBtn) {
    closeMfaModalBtn.addEventListener('click', () => {
      mfaModal.classList.add('hidden');
    });
  }

  // Forgot Password Handlers
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', () => {
      const currentEmail = document.getElementById('emailInput')?.value.trim();
      if (currentEmail) forgotEmailInput.value = currentEmail;
      hideAlert(forgotAlertContainer);
      forgotModal.classList.remove('hidden');
    });
  }

  if (closeForgotModalBtn) {
    closeForgotModalBtn.addEventListener('click', () => {
      forgotModal.classList.add('hidden');
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = forgotEmailInput.value.trim();
      if (!email) return;

      showAlert(
        forgotAlertContainer,
        `Password reset instructions sent to ${email} (Simulated).`,
        'success'
      );
      setTimeout(() => {
        forgotModal.classList.add('hidden');
      }, 2000);
    });
  }
});
