// Frontend API Client Module

const API_BASE = '/api';

/**
 * Helper to retrieve token from storage
 */
export function getStoredToken() {
  return localStorage.getItem('accessToken') || '';
}

/**
 * Helper to set token in storage
 */
export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

/**
 * Core fetch wrapper with JSON handling and authorization header
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'same-origin', // send cookies
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data.error || data.message || `Request failed with status ${res.status}`,
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
      setStoredToken(res.data.accessToken);
    }
    return res;
  },

  // Verify MFA code during login
  async verifyLoginOtp({ email, code }) {
    const res = await request('/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    if (res.success && res.data.accessToken) {
      setStoredToken(res.data.accessToken);
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
  async verifyEmailOtp(email, code) {
    return request('/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
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
  async verifySmsOtp(phone, code) {
    return request('/verify-sms-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
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
    setStoredToken(null);
    return res;
  },
};
