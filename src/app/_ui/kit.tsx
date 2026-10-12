import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: `${BUTTON_BASE} bg-neutral-900 text-white hover:bg-neutral-700`,
  secondary: `${BUTTON_BASE} border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100`,
  danger: `${BUTTON_BASE} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`,
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', className, type, ...rest }: ButtonProps) {
  const classes = `${BUTTON_VARIANTS[variant]}${className ? ` ${className}` : ''}`;
  return <button type={type ?? 'button'} className={classes} {...rest} />;
}

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ href, variant = 'primary', className, children }: LinkButtonProps) {
  const classes = `${BUTTON_VARIANTS[variant]}${className ? ` ${className}` : ''}`;
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:opacity-50';

export const labelClass = 'mb-1 block text-sm font-medium text-neutral-700';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const classes = `rounded-xl border border-neutral-200 bg-white shadow-sm${className ? ` ${className}` : ''}`;
  return <div className={classes}>{children}</div>;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-neutral-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block${className ? ` ${className}` : ''}`}>
      {label ? <span className={labelClass}>{label}</span> : null}
      {children}
      {hint ? <span className="mt-1 block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber';
}) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {children}
    </p>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const thClass =
  'whitespace-nowrap border-b border-neutral-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500';

export const tdClass = 'border-b border-neutral-100 px-3 py-2.5 align-top';
