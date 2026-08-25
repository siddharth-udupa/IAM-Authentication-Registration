/**
 * OTP View Renderer (Supports Email and SMS Verification with Single-Click Prevention)
 */
import { authState, SCREENS } from '../state.js';
import { Icons } from '../icons.js';
import { api } from '../api.js';

export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function renderOtpView(state) {
  const currentScreen = state.currentScreen;
  const isIncorrect = currentScreen === SCREENS.EMAIL_OTP_ERROR;
  const isExpired = currentScreen === SCREENS.EMAIL_OTP_EXPIRED;

  const isSms = state.selectedMethod === 'sms';
  const headerTitle = isSms ? 'SMS Verification' : 'Email Verification';
  const headerIcon = isSms ? Icons.sms('w-7 h-7') : Icons.mail('w-7 h-7');
  const headerIconBg = isSms ? 'icon-bg-green' : 'icon-bg-blue';
  const targetLabel = isSms 
    ? (state.target || state.phone || 'your mobile phone')
    : (state.target || state.email || 'student@example.com');

  const otpDigits = state.otpDigits || ['', '', '', '', '', ''];

  return `
    <div class="w-full max-w-[400px] mx-auto flex flex-col justify-center animate-fade-in relative">
      <!-- Back Arrow Button -->
      <button 
        type="button" 
        id="backToMethodBtn"
        aria-label="Back to verification methods"
        class="absolute -top-3 left-0 p-1.5 text-muted hover:text-dark transition-colors cursor-pointer rounded-lg hover:bg-slate-100 flex items-center gap-1 text-[13px] font-medium"
      >
        ${Icons.arrowLeft('w-4 h-4')}
      </button>

      <!-- Header Icon -->
      <div class="flex justify-center mb-4 pt-4">
        <div class="w-[56px] h-[56px] rounded-full ${headerIconBg} flex items-center justify-center">
          ${headerIcon}
        </div>
      </div>

      <!-- Header Title & Description -->
      <div class="text-center mb-6">
        <h1 class="text-[20px] sm:text-[22px] font-bold text-dark tracking-tight mb-1">
          ${headerTitle}
        </h1>
        <p class="text-[12px] sm:text-[13px] text-muted font-normal leading-relaxed">
          Enter the 6-digit code sent to<br>
          <strong class="font-semibold text-dark break-all">${targetLabel}</strong>
        </p>
      </div>

      <!-- 6-digit OTP Inputs Container -->
      <div class="mb-4">
        <div id="otpInputGroup" class="flex items-center justify-center gap-2 sm:gap-2.5">
          ${otpDigits.map((digit, index) => {
            const isErrorField = isIncorrect && (index === 5 || index === otpDigits.findLastIndex(d => d !== ''));
            const borderClass = isErrorField 
              ? 'border-error ring-1 ring-error/30' 
              : 'border-subtle focus:border-[#2445D8] focus:ring-2 focus:ring-[#2445D8]/20';

            return `
              <input 
                type="text" 
                inputmode="numeric" 
                maxlength="1" 
                data-index="${index}"
                value="${isExpired ? '' : (digit || '')}"
                ${isExpired ? 'disabled' : ''}
                class="otp-box w-[40px] h-[44px] sm:w-[44px] sm:h-[48px] text-center text-[16px] sm:text-[18px] font-bold text-dark bg-white rounded-lg border ${borderClass} outline-none transition-all ${isExpired ? 'bg-slate-50 cursor-not-allowed' : ''}"
                autocomplete="one-time-code"
              />
            `;
          }).join('')}
        </div>
      </div>

      <!-- Error Messaging Area -->
      <div class="min-h-[44px] flex flex-col items-center justify-center text-center text-[12px] sm:text-[12.5px] mb-3">
        ${isIncorrect ? `
          <div class="text-error font-medium space-y-0.5 animate-slide-down">
            <p>${state.otpErrorMessage || 'Incorrect code. Please try again.'}</p>
            <p>You have ${state.attemptsLeft} attempts left.</p>
          </div>
        ` : isExpired ? `
          <div class="text-error font-medium animate-slide-down">
            <p>Code expired. Request a new code.</p>
          </div>
        ` : `
          <div class="text-muted">
            Code expires in <span id="expirationTimerText" class="text-[#2445D8] font-semibold">${formatTimer(state.expirationSeconds)}</span>
          </div>
        `}
      </div>

      <!-- Timer & Resend Action Area -->
      <div class="flex flex-col items-center text-center space-y-2 select-none">
        ${isIncorrect ? `
          <div class="text-[12px] text-muted mb-1">
            Code expires in <span id="expirationTimerText" class="text-[#2445D8] font-semibold">${formatTimer(state.expirationSeconds)}</span>
          </div>
        ` : ''}

        ${isExpired ? `
          <!-- Expired State Active Resend Link -->
          <button 
            type="button" 
            id="resendCodeBtn"
            class="text-[#2445D8] font-semibold hover:underline text-[13px] cursor-pointer bg-transparent border-0 p-0 disabled:opacity-50 disabled:pointer-events-none"
          >
            Resend code
          </button>
          <p class="text-[12px] text-muted">
            You can request a new code in <span id="resendTimerText" class="text-[#2445D8] font-semibold">${formatTimer(state.resendSeconds)}</span>
          </p>
        ` : `
          <!-- Active or Countdown Resend State -->
          ${state.resendSeconds > 0 ? `
            <div class="text-[13px] text-muted">
              Resend code <span class="text-muted">(<span id="resendTimerText">${formatTimer(state.resendSeconds)}</span>)</span>
            </div>
          ` : `
            <button 
              type="button" 
              id="resendCodeBtn"
              class="text-[#2445D8] font-semibold hover:underline text-[13px] cursor-pointer bg-transparent border-0 p-0 disabled:opacity-50 disabled:pointer-events-none"
            >
              Resend code
            </button>
          `}
        `}

        <div class="pt-2">
          <button 
            type="button" 
            id="didntReceiveCodeBtn" 
            class="text-muted hover:text-dark text-[12px] transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Didn't receive the code?
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachOtpEvents(container, state) {
  const backBtn = container.querySelector('#backToMethodBtn');
  const otpBoxes = container.querySelectorAll('.otp-box');
  const resendBtn = container.querySelector('#resendCodeBtn');
  const didntReceiveBtn = container.querySelector('#didntReceiveCodeBtn');

  let isVerifying = false;

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (isVerifying) return;
      authState.setScreen(SCREENS.CHOOSE_METHOD);
    });
  }

  // OTP Input Navigation & Focus Management
  otpBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
      if (isVerifying) return;
      const value = e.target.value;
      if (!/^\d*$/.test(value)) {
        box.value = '';
        return;
      }

      if (value.length > 0) {
        authState.setOtpDigit(index, value.slice(-1), false);
        if (index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        } else {
          checkOtpSubmission();
        }
      }
    });

    box.addEventListener('keydown', (e) => {
      if (isVerifying) return;
      if (e.key === 'Backspace') {
        if (!box.value && index > 0) {
          otpBoxes[index - 1].focus();
          authState.setOtpDigit(index - 1, '', false);
        } else {
          authState.setOtpDigit(index, '', false);
        }
      }
    });

    box.addEventListener('paste', (e) => {
      if (isVerifying) return;
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{1,6}$/.test(pastedData)) {
        const digits = pastedData.split('');
        const newDigits = ['', '', '', '', '', ''];
        digits.forEach((d, i) => {
          if (i < 6) {
            newDigits[i] = d;
            if (otpBoxes[i]) otpBoxes[i].value = d;
          }
        });
        authState.setOtpDigits(newDigits, false);
        
        const nextIndex = Math.min(digits.length, 5);
        if (otpBoxes[nextIndex]) {
          otpBoxes[nextIndex].focus();
        }

        if (digits.length === 6) {
          checkOtpSubmission();
        }
      }
    });
  });

  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (isVerifying) return;
      resendBtn.disabled = true;
      resendBtn.classList.add('opacity-50', 'pointer-events-none');
      resendBtn.textContent = 'Resending...';

      const currentState = authState.getState();
      const currentEmail = currentState.email || 'student@example.com';
      const isSms = currentState.selectedMethod === 'sms';

      let res;
      if (isSms) {
        res = await api.sendSmsOtp(currentEmail, 'login_mfa');
      } else {
        res = await api.sendEmailOtp(currentEmail, 'login_mfa');
      }

      if (res.success && res.data.challengeId) {
        authState.update({ challengeId: res.data.challengeId }, false);
        alert(`A new 6-digit verification code has been sent. Check server console.`);
      } else {
        alert(res.error || 'Failed to resend code.');
      }

      resendBtn.disabled = false;
      resendBtn.classList.remove('opacity-50', 'pointer-events-none');
      resendBtn.textContent = 'Resend code';
      authState.setScreen(SCREENS.EMAIL_OTP);
    });
  }

  if (didntReceiveBtn) {
    didntReceiveBtn.addEventListener('click', () => {
      alert('Please check your server console logs for the simulated OTP code.');
    });
  }

  async function checkOtpSubmission() {
    if (isVerifying) return;
    const currentState = authState.getState();
    const digits = currentState.otpDigits.join('');

    if (digits.length === 6) {
      isVerifying = true;
      // Disable inputs during verification to prevent double clicks
      otpBoxes.forEach((b) => {
        b.disabled = true;
        b.classList.add('opacity-70', 'pointer-events-none');
      });

      const challengeId = currentState.challengeId;
      const email = currentState.email;

      // Verify OTP challenge with backend
      let res = await api.verifyLoginOtp({ challengeId, email, code: digits });
      if (!res.success) {
        res = await api.verifyEmailOtp({ challengeId, email, code: digits });
      }

      if (res.success) {
        alert('Verification successful! Access granted.');
        window.location.href = '/dashboard.html';
      } else {
        isVerifying = false;
        otpBoxes.forEach((b) => {
          b.disabled = false;
          b.classList.remove('opacity-70', 'pointer-events-none');
        });

        if (res.data?.status === 'INVALID_OTP' || res.data?.status === 'wrong_code') {
          const attemptsLeft = res.data.attemptsRemaining ?? Math.max(0, currentState.attemptsLeft - 1);
          authState.update({
            attemptsLeft,
            otpErrorMessage: 'Incorrect code. Please try again.'
          }, false);
          authState.setScreen(SCREENS.EMAIL_OTP_ERROR);
        } else if (res.data?.status === 'OTP_EXPIRED') {
          authState.setScreen(SCREENS.EMAIL_OTP_EXPIRED);
        } else if (res.data?.status === 'MAX_ATTEMPTS_EXCEEDED') {
          authState.update({
            attemptsLeft: 0,
            otpErrorMessage: 'Too many incorrect attempts. This verification challenge has expired. Request a new code.'
          }, false);
          authState.setScreen(SCREENS.EMAIL_OTP_ERROR);
        } else {
          const attemptsLeft = res.data.attemptsRemaining ?? Math.max(0, currentState.attemptsLeft - 1);
          authState.update({
            attemptsLeft,
            otpErrorMessage: res.error || 'Verification failed. Please try again.'
          }, false);
          authState.setScreen(SCREENS.EMAIL_OTP_ERROR);
        }
      }
    }
  }
}
