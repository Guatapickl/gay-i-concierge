import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ variant, children, className = '', onClose }) => {
  const variantClasses: Record<AlertVariant, string> = {
    success: 'bg-success/10 border-success/30 text-success',
    error: 'bg-danger/10 border-danger/30 text-danger',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-primary/10 border-primary/30 text-primary',
  };

  const icons: Record<AlertVariant, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4" />,
    error: <XCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div
      className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5">{icons[variant]}</span>
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
