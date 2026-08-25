/**
 * Choose Verification Method View Renderer
 */
import { authState, SCREENS } from '../state.js';
import { Icons } from '../icons.js';

export function renderChooseMethodView(state) {
  const selected = state.selectedMethod;

  const cardStyle = (methodKey) => {
    const isSelected = selected === methodKey;
    if (isSelected) {
      return 'border-[#2445D8] bg-[#F5F8FF] shadow-2xs';
    }
    return 'border-subtle bg-white hover:border-slate-300 hover:bg-slate-50/50';
  };

  const radioIndicator = (methodKey) => {
    const isSelected = selected === methodKey;
    if (isSelected) {
      return `
        <div class="w-5 h-5 rounded-full border-2 border-[#2445D8] flex items-center justify-center bg-[#2445D8]">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
      `;
    }
    return `
      <div class="w-5 h-5 rounded-full border-2 border-[#D9DDE5] bg-white"></div>
    `;
  };

  return `
    <div class="w-full max-w-[400px] mx-auto flex flex-col justify-center animate-fade-in relative">
      <!-- Back Arrow Button -->
      <button 
        type="button" 
        id="backToLoginBtn"
        aria-label="Back to login"
        class="absolute -top-3 left-0 p-1.5 text-muted hover:text-dark transition-colors cursor-pointer rounded-lg hover:bg-slate-100 flex items-center gap-1 text-[13px] font-medium"
      >
        ${Icons.arrowLeft('w-4 h-4')}
      </button>

      <!-- Header Icon -->
      <div class="flex justify-center mb-4 pt-4">
        <div class="w-[56px] h-[56px] rounded-full icon-bg-blue flex items-center justify-center">
          ${Icons.shield('w-7 h-7')}
        </div>
      </div>

      <!-- Header Text -->
      <div class="text-center mb-6">
        <h1 class="text-[20px] sm:text-[22px] font-bold text-dark tracking-tight mb-1">
          Verify your identity
        </h1>
        <p class="text-[12px] sm:text-[13px] text-muted font-normal">
          Choose a method to continue
        </p>
      </div>

      <!-- Selection Cards Container -->
      <div class="space-y-3 mb-6">
        
        <!-- Email OTP Card -->
        <div 
          data-method="email"
          class="verification-card flex items-center justify-between p-3.5 sm:p-4 rounded-[10px] border cursor-pointer transition-all ${cardStyle('email')}"
        >
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-full icon-bg-blue flex items-center justify-center shrink-0">
              ${Icons.mail('w-5 h-5')}
            </div>
            <div>
              <h3 class="text-[13.5px] font-semibold text-dark leading-tight">Email OTP</h3>
              <p class="text-[11.5px] text-muted font-normal mt-0.5">Receive a code on your email</p>
            </div>
          </div>
          <div class="shrink-0 ml-3">
            ${radioIndicator('email')}
          </div>
        </div>

        <!-- SMS OTP Card -->
        <div 
          data-method="sms"
          class="verification-card flex items-center justify-between p-3.5 sm:p-4 rounded-[10px] border cursor-pointer transition-all ${cardStyle('sms')}"
        >
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-full icon-bg-green flex items-center justify-center shrink-0">
              ${Icons.sms('w-5 h-5')}
            </div>
            <div>
              <h3 class="text-[13.5px] font-semibold text-dark leading-tight">SMS OTP</h3>
              <p class="text-[11.5px] text-muted font-normal mt-0.5">Receive a code on your mobile</p>
            </div>
          </div>
          <div class="shrink-0 ml-3">
            ${radioIndicator('sms')}
          </div>
        </div>

        <!-- Authenticator App Card -->
        <div 
          data-method="authenticator"
          class="verification-card flex items-center justify-between p-3.5 sm:p-4 rounded-[10px] border cursor-pointer transition-all ${cardStyle('authenticator')}"
        >
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-full icon-bg-gray flex items-center justify-center shrink-0">
              ${Icons.authenticator('w-5 h-5')}
            </div>
            <div>
              <h3 class="text-[13.5px] font-semibold text-dark leading-tight">Authenticator App</h3>
              <p class="text-[11.5px] text-muted font-normal mt-0.5">Use code from authenticator app</p>
            </div>
          </div>
          <div class="shrink-0 ml-3">
            ${radioIndicator('authenticator')}
          </div>
        </div>

      </div>

      <!-- Primary Continue Button -->
      <button 
        type="button" 
        id="continueMethodBtn"
        class="w-full h-[44px] bg-[#2445D8] hover:bg-[#1D3AB8] active:bg-[#17309A] text-white text-[14px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center"
      >
        Continue
      </button>
    </div>
  `;
}

export function attachChooseMethodEvents(container, state) {
  const backBtn = container.querySelector('#backToLoginBtn');
  const cards = container.querySelectorAll('.verification-card');
  const continueBtn = container.querySelector('#continueMethodBtn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      authState.setScreen(SCREENS.LOGIN_DEFAULT);
    });
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const method = card.getAttribute('data-method');
      authState.update({ selectedMethod: method });
    });
  });

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      // Transition to Email OTP view
      authState.setScreen(SCREENS.EMAIL_OTP);
    });
  }
}
