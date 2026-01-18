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
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-background hover:bg-primary-muted active:bg-primary-muted shadow-soft',
      secondary: 'bg-surface-elevated border border-border text-foreground-muted hover:text-foreground hover:border-primary/30 hover:bg-surface-hover',
      success: 'bg-success text-background hover:opacity-90 active:opacity-80',
      danger: 'bg-danger text-white hover:opacity-90 active:opacity-80',
      ghost: 'bg-transparent text-foreground-muted hover:text-foreground hover:bg-surface-hover',
      outline: 'border border-primary/50 text-primary hover:border-primary hover:bg-primary-subtle',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
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
