import { useId, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/utils";
import { DateField } from "./date-field";
import { TimeField } from "./time-field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Always visible; placeholders are not labels. */
  label: string;
  hint?: string;
  /** Says what is wrong and how to fix it. */
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * A labelled text field. `type="date"` and `type="time"` open our own
 * calendar and time picker instead of the browser's (`DateField`,
 * `TimeField`), with the same props.
 */
export function Input(props: InputProps) {
  if (props.type === "date") return <DateField {...props} />;
  if (props.type === "time") return <TimeField {...props} />;
  return <TextInput {...props} />;
}

function TextInput({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "h-11 rounded-sm border border-border-control bg-surface px-3.5 text-body text-foreground",
          "placeholder:text-subtle",
          "transition-colors duration-150 ease-standard",
          "disabled:cursor-not-allowed disabled:border-border disabled:text-muted",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {message ? (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-caption", error ? "text-danger" : "text-muted")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
