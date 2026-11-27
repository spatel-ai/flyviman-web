"use client";

import type { LucideIcon } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { ResponsivePicker } from "./responsive-picker";

export interface PickerInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> {
  /** Always visible; placeholders are not labels. */
  label: string;
  hint?: string;
  /** Says what is wrong and how to fix it. */
  error?: string;
  /** React Hook Form's `register` hands its ref over here. */
  ref?: Ref<HTMLInputElement>;
}

/** The browser's own `value` accessor (read lazily: the server has none). */
function nativeValue() {
  return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
}

/**
 * Follows a native input's value wherever it is set from: our own choice
 * (input and change events), React Hook Form writing `input.value` for
 * default values, `reset` and `setValue` (an accessor on the element,
 * around React's own), and a form reset (which says so before it resets).
 */
class InputValue {
  private input: HTMLInputElement | null = null;
  private release: (() => void) | null = null;
  private listeners = new Set<() => void>();

  constructor(private initial: string) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = () => (this.input ? this.input.value : this.initial);

  private notify = () => {
    for (const listener of this.listeners) listener();
  };

  /** Called by the input's ref; a passing `null` (a new ref) is ignored. */
  attach(input: HTMLInputElement | null) {
    if (!input || input === this.input) return;
    this.release?.();
    this.release = null;
    this.input = input;
    this.release = this.watch(input);
    this.notify();
  }

  private watch(input: HTMLInputElement) {
    const own = Object.getOwnPropertyDescriptor(input, "value");
    const base = own ?? nativeValue();
    const notify = this.notify;
    Object.defineProperty(input, "value", {
      configurable: true,
      enumerable: base?.enumerable,
      get() {
        return base?.get?.call(this);
      },
      set(next: string) {
        base?.set?.call(this, next);
        notify();
      },
    });
    const later = () => setTimeout(notify);
    const form = input.form;
    input.addEventListener("input", notify);
    input.addEventListener("change", notify);
    form?.addEventListener("reset", later);
    return () => {
      if (own) Object.defineProperty(input, "value", own);
      else Reflect.deleteProperty(input, "value");
      input.removeEventListener("input", notify);
      input.removeEventListener("change", notify);
      form?.removeEventListener("reset", later);
    };
  }
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** Sets the value as a person would, so every listener sees a change. */
function choose(input: HTMLInputElement, next: string) {
  nativeValue()?.set?.call(input, next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export interface PickerApi {
  value: string;
  /** Sets the field's value; `close` also closes the picker. */
  choose: (next: string, close?: boolean) => void;
  close: () => void;
  /** Give it to the control that should hold focus when the picker opens. */
  initialFocus: RefObject<HTMLButtonElement | null>;
}

/**
 * The shell of `DateField` and `TimeField`: label, hint and error like
 * `Input`, a button styled as the input that opens the picker, and a real,
 * visually hidden native input that holds the value. Forms keep working
 * unchanged: `register`, `value` with `onChange`, or `name` read by
 * `FormData`, with `min`, `max`, `required` and `disabled` on the input.
 */
export function PickerField({
  kind,
  icon: Icon,
  placeholder,
  format,
  invalidMessage,
  width,
  children,
  label,
  hint,
  error,
  id,
  className,
  ref,
  value: valueProp,
  defaultValue,
  disabled,
  ...inputProps
}: PickerInputProps & {
  kind: "date" | "time";
  icon: LucideIcon;
  placeholder: string;
  format: (value: string) => string;
  /** The error text when the browser finds the value missing or out of range. */
  invalidMessage: (validity: ValidityState) => string;
  width: "sm" | "md";
  children: (api: PickerApi) => ReactNode;
}) {
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const messageId = `${buttonId}-message`;
  const valueId = `${buttonId}-value`;
  const [store] = useState(
    () => new InputValue(String(valueProp ?? defaultValue ?? "")),
  );
  const domValue = useSyncExternalStore(store.subscribe, store.get, () =>
    String(valueProp ?? defaultValue ?? ""),
  );
  const value = valueProp !== undefined ? String(valueProp) : domValue;
  const input = useRef<HTMLInputElement | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const initialFocus = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  // The browser's complaint about an empty or out-of-range value, shown as
  // the field's error until the value changes.
  const [invalid, setInvalid] = useState<{ value: string; text: string }>();
  const shownError =
    error ?? (invalid && invalid.value === value ? invalid.text : undefined);
  const message = shownError ?? hint;

  function setOpenAndBlur(next: boolean) {
    setOpen(next);
    // The hidden input never really blurs; React Hook Form hears it here.
    if (!next) {
      input.current?.dispatchEvent(
        new FocusEvent("focusout", { bubbles: true }),
      );
    }
  }

  const api: PickerApi = {
    value,
    choose: (next, close = false) => {
      if (input.current) choose(input.current, next);
      if (close) setOpenAndBlur(false);
    },
    close: () => setOpenAndBlur(false),
    initialFocus,
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5">
      <label
        htmlFor={buttonId}
        className="text-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        {...inputProps}
        ref={(node) => {
          input.current = node;
          assignRef(ref, node);
          store.attach(node);
        }}
        type={kind}
        {...(valueProp !== undefined ? { value: valueProp } : { defaultValue })}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        // React Hook Form focuses the first field in error: the button.
        onFocus={() => button.current?.focus()}
        onInvalid={(event) => {
          event.preventDefault();
          const target = event.currentTarget;
          setInvalid({
            value: target.value,
            text: invalidMessage(target.validity),
          });
          // Only the form's first invalid field takes focus. (Read through
          // `validity`: matching `:invalid` fires this event again in jsdom.)
          const first = [...(target.form?.elements ?? [])].find(
            (element) =>
              element instanceof HTMLInputElement &&
              element.willValidate &&
              !element.validity.valid,
          );
          if (!first || first === target) button.current?.focus();
        }}
      />
      <ResponsivePicker
        open={open}
        onOpenChange={setOpenAndBlur}
        title={label}
        width={width}
        scroll={false}
        modal
        initialFocus={initialFocus}
        trigger={
          <button
            ref={button}
            id={buttonId}
            type="button"
            disabled={disabled}
            // As on Select's trigger: the field's value is refused.
            // eslint-disable-next-line jsx-a11y/role-supports-aria-props
            aria-invalid={shownError ? true : undefined}
            aria-describedby={[valueId, message ? messageId : null]
              .filter(Boolean)
              .join(" ")}
            className={cn(
              "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-sm border border-border-control bg-surface px-3.5 text-left text-body text-foreground tabular-nums",
              "transition-colors duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-accent",
              "disabled:cursor-not-allowed disabled:border-border disabled:text-muted",
              shownError && "border-danger",
              className,
            )}
          >
            <span
              id={valueId}
              className={cn("truncate", value ? undefined : "text-subtle")}
            >
              {value ? format(value) : placeholder}
            </span>
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
          </button>
        }
      >
        {/* Escape closes the picker only, never the dialog it opens over. */}
        <div
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            setOpenAndBlur(false);
          }}
        >
          {children(api)}
        </div>
      </ResponsivePicker>
      {message ? (
        <p
          id={messageId}
          role={shownError ? "alert" : undefined}
          className={cn(
            "text-caption",
            shownError ? "text-danger" : "text-muted",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
