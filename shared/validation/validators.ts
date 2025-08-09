export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validators = {
  email: (email: string): ValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid email address'],
    };
  },

  password: (password: string): ValidationResult => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  required: (value: any): ValidationResult => {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      errors: isValid ? [] : ['This field is required'],
    };
  },
};

export const validateForm = (fields: Record<string, any>, rules: Record<string, Function[]>): Record<string, ValidationResult> => {
  const results: Record<string, ValidationResult> = {};

  for (const [fieldName, validationRules] of Object.entries(rules)) {
    const value = fields[fieldName];
    const errors: string[] = [];

    for (const rule of validationRules) {
      const result = rule(value);
      if (!result.isValid) {
        errors.push(...result.errors);
      }
    }

    results[fieldName] = {
      isValid: errors.length === 0,
      errors,
    };
  }

  return results;
};

// Convenience exports
export const validateEmail = (email: string) => validators.email(email);
export const validatePassword = (password: string) => validators.password(password);