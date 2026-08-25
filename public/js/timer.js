/**
 * OTP Timer Countdown Manager (Updates DOM in-place without focus disruption)
 */
import { authState, SCREENS } from './state.js';
import { formatTimer } from './views/otpView.js';

class OtpTimerManager {
  constructor() {
    this.intervalId = null;
  }

  start() {
    this.stop();
    this.intervalId = setInterval(() => {
      const state = authState.getState();
      const currentScreen = state.currentScreen;

      if (currentScreen === SCREENS.EMAIL_OTP || currentScreen === SCREENS.EMAIL_OTP_ERROR) {
        let { expirationSeconds, resendSeconds } = state;
        let updated = false;

        if (expirationSeconds > 0) {
          expirationSeconds -= 1;
          updated = true;
        }

        if (resendSeconds > 0) {
          resendSeconds -= 1;
          updated = true;
        }

        if (expirationSeconds === 0) {
          this.stop();
          authState.setScreen(SCREENS.EMAIL_OTP_EXPIRED);
          return;
        }

        if (updated) {
          // Update state silently without wiping out active DOM focus
          authState.update({ expirationSeconds, resendSeconds }, false);

          // In-place DOM text updates
          const expElem = document.getElementById('expirationTimerText');
          if (expElem) expElem.textContent = formatTimer(expirationSeconds);

          const resendElem = document.getElementById('resendTimerText');
          if (resendElem) resendElem.textContent = formatTimer(resendSeconds);
        }
      } else if (currentScreen === SCREENS.EMAIL_OTP_EXPIRED) {
        let { resendSeconds } = state;
        if (resendSeconds > 0) {
          resendSeconds -= 1;
          authState.update({ resendSeconds }, false);

          const resendElem = document.getElementById('resendTimerText');
          if (resendElem) resendElem.textContent = formatTimer(resendSeconds);
        }
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const otpTimer = new OtpTimerManager();
