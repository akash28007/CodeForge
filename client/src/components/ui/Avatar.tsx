interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover ring-1 ring-subtle ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent-soft ring-1 ring-accent/30 ${sizes[size]} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
