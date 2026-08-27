// Sign Up Page Logic Module — Multi-Step Registration & OTP Flow

import { api } from './api.js';
import { showAlert, hideAlert, setupPasswordToggle } from './utils.js';

let activeRegistration = {
  email: '',
  phone: '',
  emailChallengeId: '',
  smsChallengeId: '',
};

document.addEventListener('DOMContentLoaded', async () => {
  setupPasswordToggle('passwordInput', 'togglePassword');

  // Check if user is already logged in (non-blocking)
  api.getMe().then((meRes) => {
    if (meRes.success && meRes.data?.user) {
      window.location.href = '/dashboard.html';
    }
  }).catch(() => {});

  // UI Step Containers
  const step1View = document.getElementById('step1View');
  const step2View = document.getElementById('step2View');
  const step3View = document.getElementById('step3View');
  const step4View = document.getElementById('step4View');

  // Step Indicators
  const stepInd1 = document.getElementById('stepIndicator1');
  const stepInd2 = document.getElementById('stepIndicator2');
  const stepInd3 = document.getElementById('stepIndicator3');
  const stepInd4 = document.getElementById('stepIndicator4');

  // Forms & Buttons
  const signupForm = document.getElementById('signupForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertContainer = document.getElementById('alertContainer');

  const emailOtpForm = document.getElementById('emailOtpForm');
  const emailOtpInput = document.getElementById('emailOtpInput');
  const verifyEmailOtpBtn = document.getElementById('verifyEmailOtpBtn');
  const emailOtpAlert = document.getElementById('emailOtpAlert');
  const resendEmailOtpBtn = document.getElementById('resendEmailOtpBtn');
  const emailOtpTargetText = document.getElementById('emailOtpTargetText');

  const smsOtpForm = document.getElementById('smsOtpForm');
  const smsOtpInput = document.getElementById('smsOtpInput');
  const verifySmsOtpBtn = document.getElementById('verifySmsOtpBtn');
  const smsOtpAlert = document.getElementById('smsOtpAlert');
  const resendSmsOtpBtn = document.getElementById('resendSmsOtpBtn');
  const smsOtpTargetText = document.getElementById('smsOtpTargetText');
  const smsAttemptsBadge = document.getElementById('smsAttemptsBadge');

  const backToFormBtn1 = document.getElementById('backToFormBtn1');

  function getPasswordStrength(pwd) {
    if (!pwd) return '';
    if (pwd.length < 8) return 'Weak';

    const hasNumOrSpec = /[\d]|[^a-zA-Z0-9]/.test(pwd);

    if (pwd.length >= 10 && hasNumOrSpec) return 'Strong';

    return 'Medium';
  }

  const passwordInput = document.getElementById('passwordInput');
  const strengthText = document.getElementById('passwordStrengthText');

  if (passwordInput && strengthText) {
    passwordInput.addEventListener('input', () => {
      const strength = getPasswordStrength(passwordInput.value);
      if (!strength) {
        strengthText.classList.add('hidden');
        return;
      }
      strengthText.classList.remove('hidden');
      strengthText.textContent = `Password Strength: ${strength}`;
      strengthText.className = `text-xs font-semibold mt-1 ${
        strength === 'Weak' ? 'text-red-500' : strength === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
      }`;
    });
  }

  function updateIndicators(activeStep) {
    const indicators = [stepInd1, stepInd2, stepInd3, stepInd4];
    indicators.forEach((ind, index) => {
      if (!ind) return;
      if (index + 1 === activeStep) {
        ind.className = 'flex items-center text-white font-semibold';
        ind.querySelector('span:first-child').className =
          'w-5 h-5 rounded-full bg-white/30 flex items-center justify-center mr-2 text-[10px] font-bold';
      } else if (index + 1 < activeStep) {
        ind.className = 'flex items-center text-emerald-300 font-medium';
        ind.querySelector('span:first-child').className =
          'w-5 h-5 rounded-full bg-emerald-500/40 flex items-center justify-center mr-2 text-[10px]';
      } else {
        ind.className = 'flex items-center text-blue-200/60';
        ind.querySelector('span:first-child').className =
          'w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mr-2 text-[10px]';
      }
    });
  }

  // STEP 1: Registration Form Handler
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertContainer);

      const email = document.getElementById('emailInput').value.trim();
      const phone = document.getElementById('phoneInput').value.trim();
      const password = document.getElementById('passwordInput').value;
      const confirmPassword = document.getElementById('confirmPasswordInput').value;
      const mfa_enabled = document.getElementById('mfaCheckbox').checked;

      if (getPasswordStrength(password) === 'Weak') {
        showAlert(alertContainer, 'Password is too weak. Please enter at least 8 characters to register.');
        return;
      }

      if (!email || !password || !phone) {
        showAlert(alertContainer, 'Please fill in email, phone number, and password.');
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
      submitBtn.innerHTML = `<span>Creating Account & Generating OTP...</span>`;

      try {
        const res = await api.register({ email, password, phone, mfa_enabled });

        if (res.success) {
          activeRegistration.email = email;
          activeRegistration.phone = phone;
          activeRegistration.emailChallengeId = res.data.challengeId;

          emailOtpTargetText.textContent = `An OTP code has been sent to ${email}.`;
          hideAlert(emailOtpAlert);

          // Transition to Step 2 (Email OTP View)
          step1View.classList.add('hidden');
          step2View.classList.remove('hidden');
          updateIndicators(2);
        } else {
          showAlert(alertContainer, res.error || 'Failed to initiate registration.');
        }
      } catch (err) {
        showAlert(alertContainer, 'An unexpected error occurred during registration.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Register & Continue to OTP</span>`;
      }
    });
  }

  // STEP 2: Email OTP Form Handler
  if (emailOtpForm) {
    emailOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(emailOtpAlert);

      const code = emailOtpInput.value.trim();
      if (!code || code.length !== 6) {
        showAlert(emailOtpAlert, 'Enter a valid 6-digit OTP code.', 'error');
        return;
      }

      verifyEmailOtpBtn.disabled = true;
      verifyEmailOtpBtn.textContent = 'Verifying Email OTP...';

      try {
        const res = await api.verifyEmailOtp({
          challengeId: activeRegistration.emailChallengeId,
          email: activeRegistration.email,
          code,
        });

        if (res.success) {
          if (res.data.nextStep === 'sms_otp' || res.data.status === 'SMS_VERIFICATION_REQUIRED') {
            activeRegistration.smsChallengeId = res.data.challengeId;
            smsOtpTargetText.textContent = `An SMS OTP code has been sent to ${res.data.phone || activeRegistration.phone}.`;
            hideAlert(smsOtpAlert);
            smsAttemptsBadge.textContent = '3 attempts remaining';

            // Transition to Step 3 (SMS OTP View)
            step2View.classList.add('hidden');
            step3View.classList.remove('hidden');
            updateIndicators(3);
          } else {
            // Direct Completion
            step2View.classList.add('hidden');
            step4View.classList.remove('hidden');
            updateIndicators(4);
          }
        } else {
          const status = res.data?.status;
          if (status === 'INVALID_OTP' || status === 'wrong_code') {
            const attemptsLeft = res.data.attemptsRemaining ?? 'few';
            showAlert(emailOtpAlert, `Email OTP: Wrong code entered. (${attemptsLeft} attempt(s) remaining)`, 'error');
          } else if (status === 'OTP_EXPIRED' || status === 'expired') {
            showAlert(emailOtpAlert, 'Email OTP: Expired! Please click "Resend Email OTP" below.', 'error');
          } else if (status === 'MAX_ATTEMPTS_EXCEEDED' || status === 'max_attempts_exceeded') {
            showAlert(emailOtpAlert, 'Email OTP: Maximum attempts exceeded! Please request a new OTP.', 'error');
          } else {
            showAlert(emailOtpAlert, res.error || 'Email verification failed.', 'error');
          }
        }
      } catch (err) {
        showAlert(emailOtpAlert, 'Verification request error.', 'error');
      } finally {
        verifyEmailOtpBtn.disabled = false;
        verifyEmailOtpBtn.textContent = 'Verify Email OTP';
      }
    });
  }

  // Resend Email OTP
  if (resendEmailOtpBtn) {
    resendEmailOtpBtn.addEventListener('click', async () => {
      resendEmailOtpBtn.disabled = true;
      resendEmailOtpBtn.textContent = 'Resending...';
      hideAlert(emailOtpAlert);

      const res = await api.sendEmailOtp(activeRegistration.email);
      if (res.success) {
        activeRegistration.emailChallengeId = res.data.challengeId;
        showAlert(emailOtpAlert, 'A new Email OTP has been sent! Check server console.', 'success');
      } else {
        showAlert(emailOtpAlert, res.error || 'Failed to resend Email OTP.', 'error');
      }
      resendEmailOtpBtn.disabled = false;
      resendEmailOtpBtn.textContent = 'Resend Email OTP';
    });
  }

  // STEP 3: SMS OTP Form Handler
  if (smsOtpForm) {
    smsOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(smsOtpAlert);

      const code = smsOtpInput.value.trim();
      if (!code || code.length !== 6) {
        showAlert(smsOtpAlert, 'Enter a valid 6-digit SMS OTP code.', 'error');
        return;
      }

      verifySmsOtpBtn.disabled = true;
      verifySmsOtpBtn.textContent = 'Verifying SMS OTP...';

      try {
        const res = await api.verifySmsOtp({
          challengeId: activeRegistration.smsChallengeId,
          phone: activeRegistration.phone,
          code,
        });

        if (res.success) {
          // Transition to Step 4 (MFA Complete & Registration Success)
          step3View.classList.add('hidden');
          step4View.classList.remove('hidden');
          updateIndicators(4);
        } else {
          const status = res.data?.status;
          if (status === 'INVALID_OTP' || status === 'wrong_code') {
            const attemptsLeft = res.data.attemptsRemaining ?? 0;
            smsAttemptsBadge.textContent = `${attemptsLeft} attempt(s) remaining`;
            showAlert(smsOtpAlert, `SMS OTP: Wrong code entered. (${attemptsLeft} attempt(s) left)`, 'error');
          } else if (status === 'MAX_ATTEMPTS_EXCEEDED' || status === 'max_attempts_exceeded') {
            smsAttemptsBadge.textContent = '0 attempts remaining';
            verifySmsOtpBtn.disabled = true;
            showAlert(
              smsOtpAlert,
              'SMS OTP: Maximum attempts reached! Button disabled. Click "Resend SMS OTP" to try again.',
              'error'
            );
          } else if (status === 'OTP_EXPIRED' || status === 'expired') {
            showAlert(smsOtpAlert, 'SMS OTP: Code expired. Please request a new code.', 'error');
          } else {
            showAlert(smsOtpAlert, res.error || 'SMS verification failed.', 'error');
          }
        }
      } catch (err) {
        showAlert(smsOtpAlert, 'SMS OTP verification error.', 'error');
      } finally {
        if (!verifySmsOtpBtn.disabled) {
          verifySmsOtpBtn.disabled = false;
          verifySmsOtpBtn.textContent = 'Verify SMS OTP & Complete MFA';
        }
      }
    });
  }

  // Resend SMS OTP
  if (resendSmsOtpBtn) {
    resendSmsOtpBtn.addEventListener('click', async () => {
      resendSmsOtpBtn.disabled = true;
      resendSmsOtpBtn.textContent = 'Resending...';
      hideAlert(smsOtpAlert);

      const res = await api.sendSmsOtp(activeRegistration.phone);
      if (res.success) {
        activeRegistration.smsChallengeId = res.data.challengeId;
        verifySmsOtpBtn.disabled = false;
        verifySmsOtpBtn.textContent = 'Verify SMS OTP & Complete MFA';
        smsAttemptsBadge.textContent = '3 attempts remaining';
        showAlert(smsOtpAlert, 'A new SMS OTP has been sent! Check server console.', 'success');
      } else {
        showAlert(smsOtpAlert, res.error || 'Failed to resend SMS OTP.', 'error');
      }
      resendSmsOtpBtn.disabled = false;
      resendSmsOtpBtn.textContent = 'Resend SMS OTP';
    });
  }

  if (backToFormBtn1) {
    backToFormBtn1.addEventListener('click', () => {
      step2View.classList.add('hidden');
      step1View.classList.remove('hidden');
      updateIndicators(1);
    });
  }
});
