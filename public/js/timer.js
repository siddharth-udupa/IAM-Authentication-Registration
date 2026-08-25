/**
 * OTP Timer Countdown Manager
 */
import { authState, SCREENS } from './state.js';

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
          // Timer expired! Trigger expired state transition
          this.stop();
          authState.setScreen(SCREENS.EMAIL_OTP_EXPIRED);
          return;
        }

        if (updated) {
          authState.update({ expirationSeconds, resendSeconds });
        }
      } else if (currentScreen === SCREENS.EMAIL_OTP_EXPIRED) {
        let { resendSeconds } = state;
        if (resendSeconds > 0) {
          resendSeconds -= 1;
          authState.update({ resendSeconds });
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
