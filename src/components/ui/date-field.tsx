"use client";

import { CalendarDays } from "lucide-react";
import { formatDay } from "@/lib/format/date";
import { Calendar } from "./calendar";
import { PickerField, type PickerInputProps } from "./picker-field";

/**
 * A date field: the input's look, opening a calendar (a popover from 768 px,
 * a sheet on phones). The value is `YYYY-MM-DD`, held by a hidden native
 * date input, so `register`, `value` with `onChange` and `FormData` work as
 * with `<Input type="date">`, which renders this.
 */
export function DateField(props: PickerInputProps) {
  const min = props.min === undefined ? undefined : String(props.min);
  const max = props.max === undefined ? undefined : String(props.max);
  return (
    <PickerField
      {...props}
      kind="date"
      icon={CalendarDays}
      placeholder="Choose date"
      format={formatDay}
      width="md"
      invalidMessage={(validity) =>
        validity.rangeUnderflow && min
          ? `Choose ${formatDay(min)} or later.`
          : validity.rangeOverflow && max
            ? `Choose ${formatDay(max)} or earlier.`
            : "Choose a date."
      }
    >
      {({ value, choose, initialFocus }) => (
        <Calendar
          value={value}
          min={min || undefined}
          max={max || undefined}
          focusRef={initialFocus}
          onChange={(day) => choose(day, true)}
          onClear={props.required ? undefined : () => choose("", true)}
        />
      )}
    </PickerField>
  );
}
