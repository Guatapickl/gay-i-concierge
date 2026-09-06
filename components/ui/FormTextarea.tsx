import React from 'react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    // Constrain textarea width on larger screens similar to inputs
    const baseClasses = 'w-full md:max-w-md lg:max-w-lg border rounded px-3 py-2 bg-surface border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    const errorClasses = error ? 'border-danger focus:border-danger focus:ring-danger/10' : '';
    const combinedClasses = `${baseClasses} ${errorClasses} ${className}`.trim();

    return (
      <textarea
        ref={ref}
        aria-label={props['aria-label'] || props.placeholder}
        className={combinedClasses}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
