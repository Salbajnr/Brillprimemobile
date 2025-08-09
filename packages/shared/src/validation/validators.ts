
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

  phone: (phone: string): ValidationResult => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    const isValid = phoneRegex.test(phone.replace(/\s/g, ''));
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid phone number'],
    };
  },

  password: (password: string): ValidationResult => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  required: (value: any, fieldName: string): ValidationResult => {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} is required`],
    };
  },

  minLength: (value: string, min: number, fieldName: string): ValidationResult => {
    const isValid = value.length >= min;
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be at least ${min} characters long`],
    };
  },

  maxLength: (value: string, max: number, fieldName: string): ValidationResult => {
    const isValid = value.length <= max;
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be no more than ${max} characters long`],
    };
  },
};

export function validateForm(fields: Record<string, any>, rules: Record<string, ((value: any) => ValidationResult)[]>): ValidationResult {
  const allErrors: string[] = [];

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const fieldValue = fields[fieldName];
    
    for (const rule of fieldRules) {
      const result = rule(fieldValue);
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
