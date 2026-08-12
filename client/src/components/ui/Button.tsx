import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconLoader } from '../icons';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  // `btn-gradient` carries its own fill, label colour and hover — see index.css.
  primary: 'btn-gradient shadow-glow',
  secondary: 'bg-raised hover:bg-subtle text-primary',
  outline: 'border border-subtle hover:border-muted text-primary',
  ghost: 'text-secondary hover:text-primary hover:bg-raised',
  danger: 'bg-hard/90 hover:bg-hard text-canvas',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const shared =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${shared} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <IconLoader className="w-4 h-4" /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ to, variant = 'primary', size = 'md', icon, className = '', children }: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
