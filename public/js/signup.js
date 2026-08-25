// Sign Up Page Logic Module

import { api } from './api.js';
import { showAlert, hideAlert, setupPasswordToggle } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Setup password toggle
  setupPasswordToggle('passwordInput', 'togglePassword');

  // Check if already authenticated
  const meRes = await api.getMe();
  if (meRes.success && meRes.data.user) {
    window.location.href = '/dashboard.html';
    return;
  }

  const signupForm = document.getElementById('signupForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertContainer = document.getElementById('alertContainer');

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertContainer);

      const email = document.getElementById('emailInput').value.trim();
      const phone = document.getElementById('phoneInput').value.trim() || undefined;
      const password = document.getElementById('passwordInput').value;
      const confirmPassword = document.getElementById('confirmPasswordInput').value;
      const mfa_enabled = document.getElementById('mfaCheckbox').checked;

      if (!email || !password || !confirmPassword) {
        showAlert(alertContainer, 'Please fill in all required fields.');
        return;
      }

      if (password !== confirmPassword) {
        showAlert(alertContainer, 'Passwords do not match. Please try again.');
        return;
      }

      if (password.length < 6) {
        showAlert(alertContainer, 'Password must be at least 6 characters long.');
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Creating account...</span>
      `;

      try {
        const res = await api.register({ email, password, phone, mfa_enabled });

        if (res.success) {
          showAlert(alertContainer, 'Account created successfully! Redirecting to sign in...', 'success');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 1500);
        } else {
          showAlert(alertContainer, res.error || 'Failed to register account.');
        }
      } catch (err) {
        showAlert(alertContainer, 'An unexpected error occurred during registration.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
