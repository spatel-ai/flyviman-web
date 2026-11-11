"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { FormAlert } from "@/components/shared/form-alert";
import { onboardingMessage } from "./messages";
import { canSubmit, missingChecklist, type OperatorProfile } from "./schema";

export function SubmitSection({ profile }: { profile: OperatorProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  // What the API said was missing when a submit was refused, until the
  // refreshed profile arrives.
  const [refused, setRefused] = useState<string[]>([]);

  const submit = useMutation({
    mutationFn: async () =>
      (
        await apiFetch<OperatorProfile>("operator/profile/submit", {
          method: "POST",
        })
      ).data,
    onMutate: () => {
      setError(null);
      setRefused([]);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.operatorProfile, data);
      toast({
        title: "Application submitted",
        description: "We will email you when a decision is made.",
        tone: "success",
      });
      router.refresh();
    },
    onError: (failure) => {
      setError(onboardingMessage(failure));
      if (
        failure instanceof ApiError &&
        failure.code === "OPERATOR_PROFILE_INCOMPLETE"
      ) {
        setRefused(
          failure.details.flatMap((detail) =>
            detail.field ? [detail.field] : [],
          ),
        );
      } else if (failure instanceof ApiError && failure.status === 409) {
        // The status moved on since this page loaded.
        router.refresh();
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.operatorProfile,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.operatorDocuments,
      });
    },
  });

  const missing = profile.missing.length > 0 ? profile.missing : refused;
  const checklist = missingChecklist(missing);

  return (
    <div className="flex flex-col gap-4">
      <FormAlert message={error} />
      {checklist.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p id="missing-heading" className="text-body-sm text-muted">
            Before you can submit, you still need to:
          </p>
          <ul
            aria-labelledby="missing-heading"
            className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-foreground"
          >
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-body-sm text-muted">
          Everything we need is here. Save any changes to your details first,
          then submit. You cannot make changes while we review your application.
        </p>
      )}
      <div>
        <Button
          disabled={!canSubmit(profile)}
          loading={submit.isPending}
          onClick={() => submit.mutate()}
        >
          Submit for review
        </Button>
      </div>
    </div>
  );
}
