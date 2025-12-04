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
    const baseClasses = 'font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron tracking-wide relative overflow-hidden';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-[0_0_15px_rgba(255,0,204,0.5)] hover:shadow-[0_0_25px_rgba(255,0,204,0.8)] hover:scale-105',
      secondary: 'glass border border-white/20 hover:border-accent/50 text-gray-300 hover:text-white hover:bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]',
      success: 'bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-background shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_25px_rgba(0,255,255,0.8)] hover:scale-105',
      danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] hover:scale-105',
      ghost: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-primary transition-colors',
      outline: 'border-2 border-primary/50 hover:border-primary text-primary hover:text-white hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(255,0,204,0.3)]',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-7 py-3.5 text-lg',
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
