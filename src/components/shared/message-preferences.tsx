"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadError } from "@/components/shared/load-error";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";

type Preferences = Schemas["NotificationPreferencesResponseDto"];

/** SMS and WhatsApp opt-outs, shared by the customer and operator pages. */
export function MessagePreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => apiFetch<Preferences>("me/notification-preferences"),
  });

  const save = useMutation({
    mutationFn: (change: Partial<Preferences>) =>
      apiFetch<Preferences>("me/notification-preferences", {
        method: "PATCH",
        body: change,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.notificationPreferences, saved);
      toast({ title: "Message preferences saved", tone: "success" });
    },
    onError: (failure) => toast({ title: messageFor(failure), tone: "danger" }),
  });

  return (
    <Card className="mb-8 p-6">
      <h2 className="text-h4">Message preferences</h2>
      {isError ? (
        <div className="mt-4">
          <LoadError
            what="your message preferences"
            error={error}
            onRetry={() => void refetch()}
          />
        </div>
      ) : isPending ? (
        <Skeleton className="mt-4 h-24" />
      ) : (
        <div className="mt-2 flex flex-col">
          <Checkbox
            label="Text messages (SMS)"
            checked={!data.data.smsOptedOut}
            disabled={save.isPending}
            onCheckedChange={(on) => save.mutate({ smsOptedOut: on !== true })}
          />
          <Checkbox
            label="WhatsApp"
            checked={!data.data.whatsappOptedOut}
            disabled={save.isPending}
            onCheckedChange={(on) =>
              save.mutate({ whatsappOptedOut: on !== true })
            }
          />
        </div>
      )}
      <p className="mt-4 text-small text-muted">
        Essential messages (codes, payment and booking confirmations) are always
        sent. Email and in-app messages cannot be switched off.
      </p>
    </Card>
  );
}
