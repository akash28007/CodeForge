import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './icons';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto mt-6 w-full max-w-sm">
      <Link to="/" className="mb-6 flex flex-col items-center gap-3">
        <LogoMark className="h-10 w-auto" />
        <span className="text-xl font-extrabold tracking-tight text-brand-gradient">CodeForge</span>
      </Link>

      <div className="rounded-xl border border-subtle bg-surface p-6">
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-secondary">{subtitle}</p>
        <div className="mt-5">{children}</div>
      </div>

      <p className="mt-4 text-center text-sm text-secondary">{footer}</p>
    </div>
  );
}
