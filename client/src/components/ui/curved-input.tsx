
import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CurvedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const CurvedInput = forwardRef<HTMLInputElement, CurvedInputProps>(
  ({ className, type, icon, showPasswordToggle, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          className={cn(
            'w-full py-4 border border-gray-300 curved-input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base dark:bg-gray-800 dark:border-gray-600 dark:text-white',
            icon ? 'pl-12' : 'pl-4',
            showPasswordToggle ? 'pr-14' : 'pr-4',
            className
          )}
          ref={ref}
          {...props}
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-5 flex items-center"
          >
            <svg
              className="w-5 h-5 text-gray-400 hover:text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {showPassword ? (
                <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
              ) : (
                <>
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
    );
  }
);

CurvedInput.displayName = 'CurvedInput';

export { CurvedInput };
