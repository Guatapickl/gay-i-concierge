import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, className = '', ...props }, ref) => {
    const baseClasses = 'w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
    const errorClasses = error ? 'border-red-500 focus:ring-red-500' : '';
    const combinedClasses = `${baseClasses} ${errorClasses} ${className}`.trim();

    return (
      <input
        ref={ref}
        className={combinedClasses}
        {...props}
      />
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
