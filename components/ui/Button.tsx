import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className = '', children, disabled, ...props }, ref) => {
    const baseClasses = 'font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/50',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/50',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50',
      ghost: 'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white',
      outline: 'border border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim();

    return (
      <button
        ref={ref}
        className={combinedClasses}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
