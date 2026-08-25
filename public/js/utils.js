// Frontend Utility Helpers Module

/**
 * Display alert banner inside specified target container
 * @param {HTMLElement|string} target Container element or query selector string
 * @param {string} message Text message to display
 * @param {'error'|'success'|'info'} type Alert type
 */
export function showAlert(target, message, type = 'error') {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return;

  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200 border',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 border',
    info: 'bg-blue-50 text-blue-700 border-blue-200 border',
  };

  const icons = {
    error: `<svg class="w-5 h-5 shrink-0 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    success: `<svg class="w-5 h-5 shrink-0 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    info: `<svg class="w-5 h-5 shrink-0 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  container.className = `p-3 rounded-lg text-xs md:text-sm font-medium flex items-center justify-between transition-all duration-200 ${styles[type] || styles.error}`;
  container.innerHTML = `
    <div class="flex items-center">
      ${icons[type] || icons.error}
      <span>${escapeHtml(message)}</span>
    </div>
    <button type="button" class="ml-3 text-slate-400 hover:text-slate-600 font-bold text-sm" onclick="this.parentElement.classList.add('hidden')">&times;</button>
  `;
  container.classList.remove('hidden');
}

/**
 * Hide alert banner
 */
export function hideAlert(target) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (container) {
    container.classList.add('hidden');
  }
}

/**
 * Setup password field visibility toggle
 */
export function setupPasswordToggle(inputId, toggleBtnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(toggleBtnId);
  if (!input || !btn) return;

  btn.addEventListener('click', () => {
    const isPassword = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPassword ? 'text' : 'password');
  });
}

/**
 * Escape HTML string to prevent XSS
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
