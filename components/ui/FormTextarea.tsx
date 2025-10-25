import React from 'react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    const baseClasses = 'w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
    const errorClasses = error ? 'border-red-500 focus:ring-red-500' : '';
    const combinedClasses = `${baseClasses} ${errorClasses} ${className}`.trim();

    return (
      <textarea
        ref={ref}
        className={combinedClasses}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
