"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { useAttemptKey } from "@/lib/idempotency";
import { useMessages } from "./hooks";
import { answerSchema, type AnswerValues } from "./schema";

type Message = Schemas["BookingMessageDto"];

/** The operator's questions and the customer's answers. The answer form shows only while a question is waiting. */
export function Messages({
  reference,
  awaitingAnswer,
}: {
  reference: string;
  awaitingAnswer: boolean;
}) {
  const queryClient = useQueryClient();
  const messages = useMessages(reference);
  const attempt = useAttemptKey();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<AnswerValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: { message: "" },
  });

  const send = useMutation({
    mutationFn: (message: string) =>
      apiFetch<Message[]>(
        `bookings/${encodeURIComponent(reference)}/messages`,
        {
          method: "POST",
          headers: { "Idempotency-Key": attempt.keyFor({ message }) },
          body: { message },
        },
      ),
    onSuccess: async ({ data }) => {
      reset();
      queryClient.setQueryData(queryKeys.bookingMessages(reference), data);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(reference),
        }),
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
      ]);
    },
    onError: async (failure) => {
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      setError(applyApiError(failure, setFieldError, ["message"]));
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.booking(reference),
        });
      }
    },
  });

  if (messages.isPending) return <Skeleton className="h-24" />;
  if (messages.isError) {
    return (
      <LoadError
        what="the messages"
        error={messages.error}
        onRetry={() => void messages.refetch()}
      />
    );
  }
  if (messages.data.length === 0 && !awaitingAnswer) return null;

  return (
    <section aria-labelledby="messages-heading" className="flex flex-col gap-4">
      <h2 id="messages-heading" className="text-title">
        Messages
      </h2>
      <ul className="flex flex-col gap-3">
        {messages.data.map((message) => (
          <li
            key={`${message.createdAt}-${message.from}`}
            className="flex flex-col gap-1 rounded-lg bg-surface p-4"
          >
            <p className="text-caption text-muted">
              {message.from === "OPERATOR" ? "Operator" : "You"} ·{" "}
              {formatDateTime(message.createdAt)}
            </p>
            <p className="text-body-sm whitespace-pre-wrap">{message.body}</p>
          </li>
        ))}
      </ul>
      {awaitingAnswer ? (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            setError(null);
            void handleSubmit((values) => send.mutate(values.message))(event);
          }}
        >
          <FormAlert message={error} />
          <Textarea
            label="Your answer"
            hint="The operator is waiting for this before they can answer your request."
            rows={3}
            maxLength={1000}
            error={errors.message?.message}
            {...register("message")}
          />
          <Button type="submit" loading={send.isPending} className="self-start">
            Send answer
          </Button>
        </form>
      ) : null}
    </section>
  );
}
