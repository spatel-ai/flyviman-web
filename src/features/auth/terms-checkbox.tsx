"use client";

import Link from "next/link";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

/** The consent every registration form needs, with links to what is accepted. */
export function TermsCheckbox<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Checkbox
          name={field.name}
          checked={field.value === true}
          onCheckedChange={(checked) => field.onChange(checked === true)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          label={
            <>
              I accept the{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                className="text-accent hover:underline"
              >
                terms of use
              </Link>{" "}
              and the{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="text-accent hover:underline"
              >
                privacy policy
              </Link>
              .
            </>
          }
        />
      )}
    />
  );
}
