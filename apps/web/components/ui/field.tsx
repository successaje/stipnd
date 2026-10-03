"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Right-aligned content next to the label, e.g. a unit or a link. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, aside, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside && <span className="text-xs text-ink-3">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-refuse" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-md border bg-surface text-ink placeholder:text-ink-4 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 " +
  "disabled:bg-paper-2 disabled:text-ink-3";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Static text rendered inside the field on the right, e.g. "USDC". */
  suffix?: React.ReactNode;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, suffix, mono, ...props },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        className={cn(
          inputBase,
          "h-10 px-3 text-sm",
          mono && "font-mono tabular",
          suffix && "pr-16",
          invalid ? "border-refuse focus:border-refuse focus:ring-refuse/10" : "border-line",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-ink-3">
          {suffix}
        </span>
      )}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        inputBase,
        "min-h-20 px-3 py-2 text-sm",
        invalid ? "border-refuse" : "border-line",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          inputBase,
          "h-10 appearance-none pl-3 pr-9 text-sm",
          invalid ? "border-refuse" : "border-line",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

/** A row of mutually exclusive options. Keyboard: arrow keys move, space/enter select. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-md border border-line bg-paper-2 p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-[5px] px-3 text-[13px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
