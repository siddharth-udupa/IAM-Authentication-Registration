/**
 * SecureID Application Main Entry Point (Production Authentication Flow)
 */
import { authState, SCREENS } from './state.js';
import { renderLoginView, attachLoginEvents } from './views/loginView.js';
import { renderChooseMethodView, attachChooseMethodEvents } from './views/chooseMethodView.js';
import { renderOtpView, attachOtpEvents } from './views/otpView.js';
import { otpTimer } from './timer.js';

document.addEventListener('DOMContentLoaded', () => {
  const authContainer = document.getElementById('authCardContent');
  if (!authContainer) return;

  function renderState(state) {
    const screen = state.currentScreen;

    if (screen === SCREENS.LOGIN_DEFAULT || screen === SCREENS.LOGIN_ERROR) {
      authContainer.innerHTML = renderLoginView(state);
      attachLoginEvents(authContainer, state);
      otpTimer.stop();
    } else if (screen === SCREENS.CHOOSE_METHOD) {
      authContainer.innerHTML = renderChooseMethodView(state);
      attachChooseMethodEvents(authContainer, state);
      otpTimer.stop();
    } else if (
      screen === SCREENS.EMAIL_OTP || 
      screen === SCREENS.EMAIL_OTP_ERROR || 
      screen === SCREENS.EMAIL_OTP_EXPIRED
    ) {
      authContainer.innerHTML = renderOtpView(state);
      attachOtpEvents(authContainer, state);
      otpTimer.start();
    }
  }

  // Initial render
  renderState(authState.getState());

  // Subscribe to reactive state updates
  authState.subscribe((updatedState) => {
    renderState(updatedState);
  });
});
