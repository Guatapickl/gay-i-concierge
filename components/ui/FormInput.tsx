import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, label, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2.5
            bg-surface border border-border rounded-lg
            text-foreground placeholder:text-foreground-subtle
            transition-all duration-150
            hover:border-foreground-subtle
            focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}
            ${className}
          `.trim()}
          {...props}
        />
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
