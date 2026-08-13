import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
export { formatDate, formatDateTime } from "@/lib/format";
export { CustomSelect, type CustomSelectOption } from "./custom-select";

type Tone = "neutral" | "positive" | "warning" | "danger" | "brand";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-inset ring-[#e0e0e0]",
  positive: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/60",
  brand: "bg-blue-50 text-[#0066cc] ring-1 ring-inset ring-blue-200/60",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[18px] border border-[#e0e0e0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-3.5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight-apple text-[#1d1d1f]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-[#7a7a7a]">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight-apple text-[#1d1d1f]">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-xs text-[#7a7a7a]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex gap-2 no-print">{action}</div> : null}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-[#0066cc] text-white hover:bg-[#0071e3] active:scale-[0.96] focus-visible:outline-[#0071e3]",
  secondary:
    "bg-white text-[#0066cc] border border-[#e0e0e0] hover:bg-[#f5f5f7] hover:border-[#0066cc]/40 active:scale-[0.96] focus-visible:outline-[#0071e3]",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.96] focus-visible:outline-rose-600",
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

export function LinkButton({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      {...props}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

export function Alert({
  tone,
  title,
  children,
}: {
  tone: "positive" | "danger" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const styles = {
    positive: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    danger: "border-rose-200 bg-rose-50/70 text-rose-800",
    warning: "border-amber-200 bg-amber-50/70 text-amber-800",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs ${styles}`} role="alert">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-0.5 opacity-90">{children}</div> : null}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-medium text-[#1d1d1f]"
      >
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-[#7a7a7a]">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "block w-full rounded-full border border-[#e0e0e0] bg-white px-3.5 py-1.5 text-xs text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:border-[#0066cc] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 transition-all";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-xs font-semibold text-[#1d1d1f]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-xs text-[#7a7a7a]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse text-xs">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-[#f0f0f0] bg-[#fafafc] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`border-b border-[#f0f0f0] px-4 py-2.5 align-middle text-xs ${className}`}>
      {children}
    </td>
  );
}

export function DescriptionList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a]">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-xs text-[#1d1d1f]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-[18px] border border-[#e0e0e0] bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-3.5 bg-[#fafafc]">
          <h3 className="text-sm font-semibold tracking-tight-apple text-[#1d1d1f]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-full text-xs text-[#7a7a7a] hover:bg-[#e0e0e0]/60 hover:text-[#1d1d1f] transition"
          >
            ✕
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
