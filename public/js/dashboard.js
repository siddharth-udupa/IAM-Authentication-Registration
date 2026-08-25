// Dashboard Page Logic Module

import { api } from './api.js';
import { showAlert, hideAlert } from './utils.js';

let currentUser = null;
let currentOtpMode = 'email'; // 'email' | 'sms'
let activeChallengeId = '';

document.addEventListener('DOMContentLoaded', async () => {
  const alertContainer = document.getElementById('alertContainer');
  const logoutBtn = document.getElementById('logoutBtn');
  const testProtectedBtn = document.getElementById('testProtectedBtn');
  const jsonPreview = document.getElementById('jsonPreview');

  const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');
  const sendSmsOtpBtn = document.getElementById('sendSmsOtpBtn');

  const otpModal = document.getElementById('otpModal');
  const otpModalTitle = document.getElementById('otpModalTitle');
  const otpModalSubtitle = document.getElementById('otpModalSubtitle');
  const otpDemoHint = document.getElementById('otpDemoHint');
  const otpModalAlert = document.getElementById('otpModalAlert');
  const otpForm = document.getElementById('otpForm');
  const otpCodeInput = document.getElementById('otpCodeInput');
  const closeOtpModalBtn = document.getElementById('closeOtpModalBtn');
  const verifyOtpSubmitBtn = document.getElementById('verifyOtpSubmitBtn');

  // Load User Profile
  async function loadProfile() {
    const res = await api.getMe();
    if (!res.success || !res.data.user) {
      window.location.href = '/index.html';
      return;
    }

    currentUser = res.data.user;

    // Update UI elements
    document.getElementById('userEmailNav').textContent = currentUser.email;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = currentUser.phone || 'Not provided';

    // Update badges
    renderBadge('emailStatusBadge', currentUser.emailVerified, 'Verified', 'Unverified');
    renderBadge('phoneStatusBadge', currentUser.phoneVerified, 'Verified', 'Unverified');
    renderBadge('mfaStatusBadge', currentUser.mfaEnabled, 'Enabled', 'Disabled');
  }

  function renderBadge(elementId, isTrue, trueText, falseText) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isTrue) {
      el.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800';
      el.textContent = trueText;
    } else {
      el.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800';
      el.textContent = falseText;
    }
  }

  await loadProfile();

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.logout();
      window.location.href = '/index.html';
    });
  }

  // Protected Route Test Handler
  if (testProtectedBtn) {
    testProtectedBtn.addEventListener('click', async () => {
      jsonPreview.textContent = 'Fetching /api/protected...';
      const res = await api.getProtected();
      jsonPreview.textContent = JSON.stringify(res, null, 2);
    });
  }

  // Send Email OTP Button Handler
  if (sendEmailOtpBtn) {
    sendEmailOtpBtn.addEventListener('click', async () => {
      hideAlert(alertContainer);
      if (!currentUser?.email) return;

      sendEmailOtpBtn.disabled = true;
      sendEmailOtpBtn.textContent = 'Sending...';

      try {
        const res = await api.sendEmailOtp(currentUser.email);
        if (res.success) {
          currentOtpMode = 'email';
          activeChallengeId = res.data.challengeId;
          otpModalTitle.textContent = 'Verify Email Address';
          otpModalSubtitle.textContent = `Enter the code sent to ${currentUser.email}`;
          otpDemoHint.textContent = 'Check backend terminal console for simulated OTP';
          otpDemoHint.classList.remove('hidden');
          hideAlert(otpModalAlert);
          otpCodeInput.value = '';
          otpModal.classList.remove('hidden');
        } else {
          showAlert(alertContainer, res.error || 'Failed to send Email OTP');
        }
      } catch (err) {
        showAlert(alertContainer, 'Error sending Email OTP');
      } finally {
        sendEmailOtpBtn.disabled = false;
        sendEmailOtpBtn.textContent = 'Send Email OTP';
      }
    });
  }

  // Send SMS OTP Button Handler
  if (sendSmsOtpBtn) {
    sendSmsOtpBtn.addEventListener('click', async () => {
      hideAlert(alertContainer);
      if (!currentUser?.phone) {
        showAlert(alertContainer, 'Please update your account with a phone number first.');
        return;
      }

      sendSmsOtpBtn.disabled = true;
      sendSmsOtpBtn.textContent = 'Sending...';

      try {
        const res = await api.sendSmsOtp(currentUser.phone);
        if (res.success) {
          currentOtpMode = 'sms';
          activeChallengeId = res.data.challengeId;
          otpModalTitle.textContent = 'Verify Phone Number';
          otpModalSubtitle.textContent = `Enter the code sent to ${currentUser.phone}`;
          otpDemoHint.textContent = 'Check backend terminal console for simulated OTP';
          otpDemoHint.classList.remove('hidden');
          hideAlert(otpModalAlert);
          otpCodeInput.value = '';
          otpModal.classList.remove('hidden');
        } else {
          showAlert(alertContainer, res.error || 'Failed to send SMS OTP');
        }
      } catch (err) {
        showAlert(alertContainer, 'Error sending SMS OTP');
      } finally {
        sendSmsOtpBtn.disabled = false;
        sendSmsOtpBtn.textContent = 'Send SMS OTP';
      }
    });
  }

  // Modal Close Button
  if (closeOtpModalBtn) {
    closeOtpModalBtn.addEventListener('click', () => {
      otpModal.classList.add('hidden');
    });
  }

  // OTP Form Submission
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(otpModalAlert);

      const code = otpCodeInput.value.trim();
      if (!code || code.length !== 6) {
        showAlert(otpModalAlert, 'Enter a valid 6-digit OTP code.');
        return;
      }

      verifyOtpSubmitBtn.disabled = true;
      verifyOtpSubmitBtn.textContent = 'Verifying...';

      try {
        let res;
        if (currentOtpMode === 'email') {
          res = await api.verifyEmailOtp({
            challengeId: activeChallengeId,
            email: currentUser.email,
            code,
          });
        } else {
          res = await api.verifySmsOtp({
            challengeId: activeChallengeId,
            phone: currentUser.phone,
            code,
          });
        }

        if (res.success) {
          showAlert(otpModalAlert, 'Verification successful!', 'success');
          await loadProfile();
          setTimeout(() => {
            otpModal.classList.add('hidden');
          }, 800);
        } else {
          showAlert(otpModalAlert, res.error || 'Invalid code.');
        }
      } catch (err) {
        showAlert(otpModalAlert, 'Verification failed.');
      } finally {
        verifyOtpSubmitBtn.disabled = false;
        verifyOtpSubmitBtn.textContent = 'Verify';
      }
    });
  }
});
