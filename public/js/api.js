// Frontend API Client Module

const API_BASE = '/api';

// In-memory token for optional authorization header when needed
let inMemoryJwtToken = '';

export function setMemoryToken(token) {
  inMemoryJwtToken = token || '';
}

export function getMemoryToken() {
  return inMemoryJwtToken;
}

/**
 * Core fetch wrapper with JSON handling and cookie credentials
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (inMemoryJwtToken) {
    headers['Authorization'] = `Bearer ${inMemoryJwtToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'same-origin', // include HttpOnly cookies
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data.error || data.message || `Request failed with status ${res.status}`,
        data,
      };
    }

    return {
      success: true,
      status: res.status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: err.message || 'Network error, please try again.',
    };
  }
}

export const api = {
  // Register user
  async register({ email, password, phone, mfa_enabled }) {
    return request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, phone, mfa_enabled }),
    });
  },

  // Login user
  async login({ email, password }) {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data.accessToken) {
      setMemoryToken(res.data.accessToken);
    }
    return res;
  },

  // Verify MFA code during login
  async verifyLoginOtp({ challengeId, email, code }) {
    const res = await request('/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId, email, code }),
    });
    if (res.success && res.data.accessToken) {
      setMemoryToken(res.data.accessToken);
    }
    return res;
  },

  // Send Email OTP
  async sendEmailOtp(email) {
    return request('/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Verify Email OTP
  async verifyEmailOtp({ challengeId, email, code }) {
    return request('/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId, email, code }),
    });
  },

  // Send SMS OTP
  async sendSmsOtp(phone) {
    return request('/send-sms-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  // Verify SMS OTP
  async verifySmsOtp({ challengeId, phone, code }) {
    return request('/verify-sms-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId, phone, code }),
    });
  },

  // Get current user profile
  async getMe() {
    return request('/me', { method: 'GET' });
  },

  // Get protected endpoint demo data
  async getProtected() {
    return request('/protected', { method: 'GET' });
  },

  // Logout user
  async logout() {
    const res = await request('/logout', { method: 'POST' });
    setMemoryToken('');
    return res;
  },
};
