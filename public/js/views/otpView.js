/**
 * Email OTP View Renderer (Production Authentication Flow)
 */
import { authState, SCREENS } from '../state.js';
import { Icons } from '../icons.js';

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function renderOtpView(state) {
  const currentScreen = state.currentScreen;
  const isIncorrect = currentScreen === SCREENS.EMAIL_OTP_ERROR;
  const isExpired = currentScreen === SCREENS.EMAIL_OTP_EXPIRED;

  const otpDigits = state.otpDigits || ['', '', '', '', '', ''];
  const email = state.email || 'priya.sharma@email.com';

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

      <!-- Header Icon (Outline Blue Mail icon in pale blue circular background) -->
      <div class="flex justify-center mb-4 pt-4">
        <div class="w-[56px] h-[56px] rounded-full icon-bg-blue flex items-center justify-center">
          ${Icons.mail('w-7 h-7')}
        </div>
      </div>

      <!-- Header Title & Description -->
      <div class="text-center mb-6">
        <h1 class="text-[20px] sm:text-[22px] font-bold text-dark tracking-tight mb-1">
          Email Verification
        </h1>
        <p class="text-[12px] sm:text-[13px] text-muted font-normal leading-relaxed">
          Enter the 6-digit code sent to<br>
          <strong class="font-semibold text-dark break-all">${email}</strong>
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

      <!-- Error Messaging Area (Reserved height to prevent layout jumps) -->
      <div class="min-h-[44px] flex flex-col items-center justify-center text-center text-[12px] sm:text-[12.5px] mb-3">
        ${isIncorrect ? `
          <div class="text-error font-medium space-y-0.5 animate-slide-down">
            <p>Incorrect code. Please try again.</p>
            <p>You have ${state.attemptsLeft} attempts left.</p>
          </div>
        ` : isExpired ? `
          <div class="text-error font-medium animate-slide-down">
            <p>Code expired.</p>
          </div>
        ` : `
          <div class="text-muted">
            Code expires in <span class="text-[#2445D8] font-semibold">${formatTimer(state.expirationSeconds)}</span>
          </div>
        `}
      </div>

      <!-- Timer & Resend Action Area -->
      <div class="flex flex-col items-center text-center space-y-2 select-none">
        ${isIncorrect ? `
          <div class="text-[12px] text-muted mb-1">
            Code expires in <span class="text-[#2445D8] font-semibold">${formatTimer(state.expirationSeconds)}</span>
          </div>
        ` : ''}

        ${isExpired ? `
          <!-- Expired State Active Resend Link -->
          <button 
            type="button" 
            id="resendCodeBtn"
            class="text-[#2445D8] font-semibold hover:underline text-[13px] cursor-pointer bg-transparent border-0 p-0"
          >
            Resend code
          </button>
          <p class="text-[12px] text-muted">
            You can request a new code in <span class="text-[#2445D8] font-semibold">${formatTimer(state.resendSeconds)}</span>
          </p>
        ` : `
          <!-- Active or Countdown Resend State -->
          ${state.resendSeconds > 0 ? `
            <div class="text-[13px] text-muted">
              Resend code <span class="text-muted">(${formatTimer(state.resendSeconds)})</span>
            </div>
          ` : `
            <button 
              type="button" 
              id="resendCodeBtn"
              class="text-[#2445D8] font-semibold hover:underline text-[13px] cursor-pointer bg-transparent border-0 p-0"
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

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      authState.setScreen(SCREENS.CHOOSE_METHOD);
    });
  }

  // Focus the first OTP box automatically on screen render if empty
  if (otpBoxes.length > 0 && !state.otpDigits.some(d => d !== '') && state.currentScreen !== SCREENS.EMAIL_OTP_EXPIRED) {
    setTimeout(() => otpBoxes[0].focus(), 50);
  }

  // OTP Input Navigation & Paste Handling
  otpBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!/^\d*$/.test(value)) {
        box.value = '';
        return;
      }

      if (value.length > 0) {
        authState.setOtpDigit(index, value.slice(-1));
        if (index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        } else {
          checkOtpSubmission();
        }
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!box.value && index > 0) {
          otpBoxes[index - 1].focus();
          authState.setOtpDigit(index - 1, '');
        } else {
          authState.setOtpDigit(index, '');
        }
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{1,6}$/.test(pastedData)) {
        const digits = pastedData.split('');
        const newDigits = ['', '', '', '', '', ''];
        digits.forEach((d, i) => {
          if (i < 6) newDigits[i] = d;
        });
        authState.setOtpDigits(newDigits);
        
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
    resendBtn.addEventListener('click', () => {
      alert(`A new 6-digit verification code has been sent to ${state.email || 'your email'}.`);
      authState.setScreen(SCREENS.EMAIL_OTP);
    });
  }

  if (didntReceiveBtn) {
    didntReceiveBtn.addEventListener('click', () => {
      alert('Please check your spam folder or go back to choose a different verification method.');
    });
  }

  function checkOtpSubmission() {
    const digits = authState.getState().otpDigits.join('');
    if (digits.length === 6) {
      // Demo validation: 123456 or 482913 are valid OTPs
      if (digits === '123456' || digits === '482913') {
        alert('Verification successful! Logging in to SecureID...');
        authState.reset();
      } else {
        // Wrong OTP -> Transition to State 5: Incorrect OTP
        const currentAttempts = authState.getState().attemptsLeft;
        const newAttempts = Math.max(0, currentAttempts - 1);
        authState.update({ attemptsLeft: newAttempts });
        authState.setScreen(SCREENS.EMAIL_OTP_ERROR);
      }
    }
  }
}
