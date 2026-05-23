/**
 * Common Validation Utilities
 */

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) {
    return { isValid: false, error: 'Please enter your email address.' };
  }
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true };
};

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

// Single source of truth for password complexity. Used by the validator and
// by the live PasswordChecklist UI component so they stay in sync.
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'One special character (e.g. !@#$%)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export interface PasswordRuleResult extends PasswordRule {
  passed: boolean;
}

export const evaluatePasswordRules = (password: string): PasswordRuleResult[] =>
  PASSWORD_RULES.map(rule => ({ ...rule, passed: rule.test(password) }));

// Strict validation used at PASSWORD CREATION time (sign up, set new password,
// change password). Enforces the full complexity policy.
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Please enter a password.' };
  }
  const failed = evaluatePasswordRules(password).filter(r => !r.passed);
  if (failed.length > 0) {
    return {
      isValid: false,
      error: 'Password is too weak. Please satisfy all requirements.',
    };
  }
  return { isValid: true };
};

// Lightweight check used at SIGN-IN time. Existing accounts may have legacy
// passwords that predate the current complexity policy, so we only verify
// that something was entered and let the server validate the credentials.
export const validateSignInPassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Please enter your password.' };
  }
  return { isValid: true };
};

export const validateConfirmPassword = (password: string, confirm: string): { isValid: boolean; error?: string } => {
  const passCheck = validatePassword(password);
  if (!passCheck.isValid) return passCheck;
  if (password !== confirm) {
    return { isValid: false, error: 'Passwords do not match.' };
  }
  return { isValid: true };
};

export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name.trim()) {
    return { isValid: false, error: 'Please enter your full name.' };
  }
  return { isValid: true };
};

export const validatePhone = (phone: string, countryCode?: string): { isValid: boolean; error?: string } => {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your phone number.' };
  }

  if (countryCode) {
    const code = countryCode.toUpperCase();
    if (code === 'IN' && trimmed.length !== 10) {
      return { isValid: false, error: 'Indian phone number must be exactly 10 digits.' };
    }
    if ((code === 'US' || code === 'CA') && trimmed.length !== 10) {
      return { isValid: false, error: 'Phone number must be exactly 10 digits.' };
    }
    if (code === 'AU' && trimmed.length !== 9) {
      return { isValid: false, error: 'Australian phone number must be exactly 9 digits.' };
    }
    if (code === 'GB' && trimmed.length !== 10) {
      return { isValid: false, error: 'UK phone number must be exactly 10 digits.' };
    }
    if (code === 'SG' && trimmed.length !== 8) {
      return { isValid: false, error: 'Singapore phone number must be exactly 8 digits.' };
    }
    if (code === 'AE' && trimmed.length !== 9) {
      return { isValid: false, error: 'UAE phone number must be exactly 9 digits.' };
    }
  }

  if (trimmed.length < 7 || trimmed.length > 15) {
    return { isValid: false, error: 'Please enter a valid phone number.' };
  }
  return { isValid: true };
};

export const validateOTP = (otp: string[]): { isValid: boolean; error?: string } => {
  const isCompleted = otp.every(digit => digit !== '');
  if (!isCompleted) {
    return { isValid: false, error: `Please enter the ${otp.length}-digit OTP code.` };
  }
  return { isValid: true };
};
