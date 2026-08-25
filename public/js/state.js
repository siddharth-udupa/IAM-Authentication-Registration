/**
 * SecureID Central Reactive State Store (Production Authentication Flow)
 */

export const SCREENS = {
  LOGIN_DEFAULT: 'login',
  LOGIN_ERROR: 'login-error',
  CHOOSE_METHOD: 'choose-method',
  EMAIL_OTP: 'email-otp',
  EMAIL_OTP_ERROR: 'email-otp-error',
  EMAIL_OTP_EXPIRED: 'email-otp-expired'
};

class AuthState {
  constructor() {
    this.listeners = [];
    this.reset();
  }

  reset() {
    this.state = {
      currentScreen: SCREENS.LOGIN_DEFAULT,
      email: '',
      password: '',
      rememberMe: false,
      selectedMethod: 'email', // 'email' | 'sms' | 'authenticator'
      otpDigits: ['', '', '', '', '', ''],
      expirationSeconds: 165, // 02:45
      resendSeconds: 25,       // 00:25
      attemptsLeft: 3,
      loginErrorMessage: 'Invalid email or password. Please try again.',
      otpErrorMessage: 'Incorrect code. Please try again.'
    };
    this.notify();
  }

  getState() {
    return { ...this.state };
  }

  setScreen(screen) {
    if (Object.values(SCREENS).includes(screen)) {
      this.state.currentScreen = screen;
      
      // Configure state when switching screens in natural production flow
      if (screen === SCREENS.EMAIL_OTP) {
        this.state.otpDigits = ['', '', '', '', '', ''];
        this.state.expirationSeconds = 165;
        this.state.resendSeconds = 25;
      } else if (screen === SCREENS.EMAIL_OTP_EXPIRED) {
        this.state.otpDigits = ['', '', '', '', '', ''];
        this.state.expirationSeconds = 0;
        this.state.resendSeconds = 28;
      }

      this.notify();
    }
  }

  update(fields) {
    this.state = { ...this.state, ...fields };
    this.notify();
  }

  setOtpDigit(index, value) {
    const newDigits = [...this.state.otpDigits];
    newDigits[index] = value;
    this.state.otpDigits = newDigits;
    this.notify();
  }

  setOtpDigits(digitsArray) {
    this.state.otpDigits = digitsArray.slice(0, 6);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const authState = new AuthState();
