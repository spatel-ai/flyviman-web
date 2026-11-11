"use client";

import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { applyApiError } from "@/lib/api/messages";

/**
 * Wraps a form's submit action: clears and sets the form-level error, and
 * places the API's field errors under their fields.
 */
export function useSubmit<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const [formError, setFormError] = useState<string | null>(null);

  function submit<V>(action: (values: V) => Promise<void>) {
    return async (values: V) => {
      setFormError(null);
      try {
        await action(values);
      } catch (error) {
        setFormError(applyApiError(error, setError, fields));
      }
    };
  }

  return { formError, setFormError, submit };
}
