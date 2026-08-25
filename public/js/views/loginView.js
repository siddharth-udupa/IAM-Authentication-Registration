/**
 * Login View Renderer (Production Authentication Flow)
 */
import { authState, SCREENS } from '../state.js';
import { Icons } from '../icons.js';

let showPassword = false;

export function renderLoginView(state) {
  const isError = state.currentScreen === SCREENS.LOGIN_ERROR;

  // Header Icon styling
  const iconContainerBg = isError ? 'icon-bg-red' : 'icon-bg-blue';
  const iconSvg = isError ? Icons.shieldError('w-7 h-7') : Icons.shield('w-7 h-7');

  const emailBorder = isError ? 'border-error ring-1 ring-error/20' : 'border-subtle focus-within:border-[#2445D8] focus-within:ring-2 focus-within:ring-[#2445D8]/20';
  const passwordBorder = isError ? 'border-error ring-1 ring-error/20' : 'border-subtle focus-within:border-[#2445D8] focus-within:ring-2 focus-within:ring-[#2445D8]/20';

  return `
    <div class="w-full max-w-[400px] mx-auto flex flex-col justify-center animate-fade-in">
      <!-- Header Security Icon -->
      <div class="flex justify-center mb-4">
        <div class="w-[56px] h-[56px] rounded-full ${iconContainerBg} flex items-center justify-center transition-colors duration-200">
          ${iconSvg}
        </div>
      </div>

      <!-- Title & Subtitle -->
      <div class="text-center mb-6">
        <h1 class="text-[20px] sm:text-[22px] font-bold text-dark tracking-tight mb-1">
          Welcome back!
        </h1>
        <p class="text-[12px] sm:text-[13px] text-muted font-normal">
          Login to your account
        </p>
      </div>

      <!-- Login Form -->
      <form id="loginForm" class="space-y-4" novalidate>
        <!-- Email/Username Input -->
        <div>
          <div class="relative flex items-center h-[44px] rounded-lg border ${emailBorder} bg-white px-3.5 transition-all">
            <span class="text-[#9CA3AF] mr-2.5 shrink-0 flex items-center">
              ${Icons.user('w-4 h-4')}
            </span>
            <input 
              type="email" 
              id="loginEmailInput"
              value="${state.email || ''}"
              placeholder="Email or Username"
              class="w-full bg-transparent text-dark text-[13px] outline-none placeholder-muted font-normal"
              autocomplete="email"
              required
            />
            ${isError ? `<span class="text-error ml-2 shrink-0">${Icons.exclamation('w-4 h-4')}</span>` : ''}
          </div>
        </div>

        <!-- Password Input -->
        <div>
          <div class="relative flex items-center h-[44px] rounded-lg border ${passwordBorder} bg-white px-3.5 transition-all">
            <span class="text-[#9CA3AF] mr-2.5 shrink-0 flex items-center">
              ${Icons.lock('w-4 h-4')}
            </span>
            <input 
              type="${showPassword ? 'text' : 'password'}" 
              id="loginPasswordInput"
              value="${state.password || ''}"
              placeholder="Password"
              class="w-full bg-transparent text-dark text-[13px] outline-none placeholder-muted font-normal ${!showPassword && state.password ? 'tracking-wider font-semibold' : ''}"
              autocomplete="current-password"
              required
            />
            <button 
              type="button" 
              id="togglePasswordBtn"
              aria-label="Toggle password visibility"
              class="ml-2 shrink-0 text-[#9CA3AF] hover:text-[#4B5563] focus:outline-none cursor-pointer p-1"
            >
              ${showPassword ? Icons.eyeOff('w-4 h-4') : Icons.eye('w-4 h-4')}
            </button>
          </div>
          
          <!-- Error Message directly beneath Password field -->
          ${isError ? `
            <div class="mt-2 text-left text-[11px] sm:text-[12px] text-error font-medium flex items-center gap-1.5 animate-slide-down">
              <span>${state.loginErrorMessage}</span>
            </div>
          ` : ''}
        </div>

        <!-- Remember Me & Forgot Password Row -->
        <div class="flex items-center justify-between text-[12px] sm:text-[13px] pt-0.5 select-none">
          <label class="flex items-center cursor-pointer group">
            <input 
              type="checkbox" 
              id="rememberMeCheckbox"
              ${state.rememberMe ? 'checked' : ''}
              class="w-[16px] h-[16px] rounded border-subtle text-[#2445D8] focus:ring-[#2445D8] cursor-pointer accent-[#2445D8]"
            />
            <span class="ml-2 text-muted group-hover:text-dark transition-colors">Remember me</span>
          </label>
          <a 
            href="#forgot" 
            id="forgotPasswordLink"
            class="text-[#2445D8] hover:underline font-medium transition-colors cursor-pointer"
          >
            Forgot password?
          </a>
        </div>

        <!-- Primary Login Button -->
        <div class="pt-1">
          <button 
            type="submit" 
            id="loginSubmitBtn"
            class="w-full h-[44px] bg-[#2445D8] hover:bg-[#1D3AB8] active:bg-[#17309A] text-white text-[14px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center"
          >
            Login
          </button>
        </div>
      </form>

      <!-- Divider -->
      <div class="relative my-5 flex items-center justify-center">
        <div class="w-full border-t border-subtle"></div>
        <span class="absolute bg-white px-3 text-[12px] text-muted font-normal">or</span>
      </div>

      <!-- Google OAuth Button -->
      <button 
        type="button" 
        id="googleAuthBtn"
        class="w-full h-[44px] bg-white border border-subtle hover:bg-slate-50 text-dark text-[13.5px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2.5 shadow-2xs"
      >
        ${Icons.google('w-4 h-4')}
        <span>Continue with Google</span>
      </button>

      <!-- Registration Prompt -->
      <div class="mt-6 text-center text-[12px] sm:text-[13px] text-muted">
        <span>New here? </span>
        <a href="/signup.html" id="createAccountLink" class="text-[#2445D8] font-semibold hover:underline transition-colors">Create an account</a>
      </div>
    </div>
  `;
}

export function attachLoginEvents(container, state) {
  const emailInput = container.querySelector('#loginEmailInput');
  const passwordInput = container.querySelector('#loginPasswordInput');
  const rememberCheckbox = container.querySelector('#rememberMeCheckbox');
  const togglePasswordBtn = container.querySelector('#togglePasswordBtn');
  const loginForm = container.querySelector('#loginForm');
  const googleBtn = container.querySelector('#googleAuthBtn');
  const createAccountLink = container.querySelector('#createAccountLink');
  const forgotPasswordLink = container.querySelector('#forgotPasswordLink');

  if (emailInput) {
    emailInput.addEventListener('input', (e) => {
      authState.update({ email: e.target.value });
      // If was showing error, reset error highlight on input typing
      if (state.currentScreen === SCREENS.LOGIN_ERROR) {
        authState.update({ currentScreen: SCREENS.LOGIN_DEFAULT });
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      authState.update({ password: e.target.value });
      if (state.currentScreen === SCREENS.LOGIN_ERROR) {
        authState.update({ currentScreen: SCREENS.LOGIN_DEFAULT });
      }
    });
  }

  if (rememberCheckbox) {
    rememberCheckbox.addEventListener('change', (e) => {
      authState.update({ rememberMe: e.target.checked });
    });
  }

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      showPassword = !showPassword;
      authState.notify();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currEmail = (emailInput ? emailInput.value : authState.getState().email).trim();
      const currPassword = (passwordInput ? passwordInput.value : authState.getState().password).trim();

      // Form Validation & Authentication Flow:
      // If inputs are empty or contain 'invalid', transition to Login Error state
      if (!currEmail || !currPassword || currEmail.includes('invalid') || currPassword.includes('invalid')) {
        authState.update({ email: currEmail, password: currPassword });
        authState.setScreen(SCREENS.LOGIN_ERROR);
      } else {
        // Successful login credentials -> Move to Choose Verification Method
        authState.update({ email: currEmail, password: currPassword });
        authState.setScreen(SCREENS.CHOOSE_METHOD);
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      alert('Redirecting to Google Enterprise Authentication...');
    });
  }

  if (createAccountLink) {
    createAccountLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/signup.html';
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Password reset instructions have been sent to your email.');
    });
  }
}
