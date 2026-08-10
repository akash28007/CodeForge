export interface PasswordStrength {
  /** 0-4 */
  score: number;
  label: string;
  /** Tailwind bg-* class for the meter fill. */
  color: string;
  /** The most useful single thing the user could do to improve it. */
  hint: string | null;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: '', color: 'bg-raised', hint: null };
  }

  const checks = {
    length: password.length >= 12,
    minimum: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (checks.minimum) score++;
  if (checks.lower && checks.upper) score++;
  if (checks.digit) score++;
  if (checks.symbol) score++;
  if (checks.length && score >= 3) score = 4;

  let hint: string | null = null;
  if (!checks.minimum) hint = 'Use at least 8 characters';
  else if (!checks.upper || !checks.lower) hint = 'Mix upper and lower case';
  else if (!checks.digit) hint = 'Add a number';
  else if (!checks.symbol) hint = 'Add a symbol';
  else if (!checks.length) hint = '12+ characters is stronger';

  const scale = [
    { label: 'Very weak', color: 'bg-hard' },
    { label: 'Weak', color: 'bg-hard' },
    { label: 'Fair', color: 'bg-medium' },
    { label: 'Good', color: 'bg-info' },
    { label: 'Strong', color: 'bg-easy' },
  ];

  return { score, label: scale[score].label, color: scale[score].color, hint };
}
