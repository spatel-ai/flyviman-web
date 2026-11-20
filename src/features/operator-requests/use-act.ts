"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Runs one action on a request. Success refreshes the request and says so.
 * A conflict (409: the request changed, the aircraft is gone, a quote was
 * answered) is a result, not a failure: it is shown on the page, the request
 * is refreshed, and the caller closes its dialog. Anything else is thrown so
 * the dialog can show it and stay open.
 */
export function useAct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.operatorRequestsAll });

  /** For a failure a dialog cannot show itself; true when it was a conflict. */
  function conflict(error: unknown): boolean {
    if (error instanceof ApiError && error.status === 409) {
      setProblem(messageFor(error));
      void refresh();
      return true;
    }
    return false;
  }

  async function act(done: string, call: () => Promise<unknown>) {
    setProblem(null);
    try {
      await call();
    } catch (error) {
      if (conflict(error)) return;
      void refresh();
      throw error;
    }
    await finished(done);
  }

  /** For a call made elsewhere (the quote form) that has just succeeded. */
  async function finished(message: string) {
    setProblem(null);
    toast({ title: message, tone: "success" });
    await refresh();
  }

  return { act, finished, conflict, problem };
}

export type Act = ReturnType<typeof useAct>["act"];
