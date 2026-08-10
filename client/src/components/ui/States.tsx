import type { ReactNode } from 'react';
import { IconAlertTriangle } from '../icons';
import Button from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      {icon && <div className="text-muted mb-3 [&>svg]:w-10 [&>svg]:h-10">{icon}</div>}
      <h3 className="font-semibold text-primary">{title}</h3>
      {description && <p className="text-sm text-secondary mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      <IconAlertTriangle className="w-10 h-10 text-hard mb-3" />
      <h3 className="font-semibold text-primary">{title}</h3>
      {description && <p className="text-sm text-secondary mt-1.5 max-w-sm">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
