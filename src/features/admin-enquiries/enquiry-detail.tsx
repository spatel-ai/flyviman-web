"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/shared/load-error";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { topicLabel } from "./filters";

type Enquiry = Schemas["AdminEnquiryResponseDto"];

export function EnquiryDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminEnquiry(id),
    queryFn: () =>
      apiFetch<Enquiry>(`admin/enquiries/${encodeURIComponent(id)}`),
  });

  const handle = useMutation({
    mutationFn: () =>
      apiFetch<Enquiry>(`admin/enquiries/${encodeURIComponent(id)}/handle`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "enquiries"] });
      toast({ title: "Marked as handled", tone: "success" });
    },
    onError: (failure) => toast({ title: messageFor(failure), tone: "danger" }),
  });

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Enquiry not found"
        description="This enquiry does not exist, or the link is not correct."
        backHref="/admin/enquiries"
        backLabel="Back to enquiries"
      />
    );
  }
  if (isError) {
    return (
      <>
        <h1 className="text-h2">Enquiry</h1>
        <div className="mt-6">
          <LoadError
            what="this enquiry"
            error={error}
            onRetry={() => void refetch()}
          />
        </div>
      </>
    );
  }
  if (isPending) {
    return (
      <>
        <h1 className="text-h2">Enquiry</h1>
        <p role="status" className="sr-only">
          Loading enquiry
        </p>
        <Skeleton className="mt-6 h-72" />
      </>
    );
  }

  const enquiry = data.data;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/enquiries"
          className="text-body-sm text-accent hover:underline"
        >
          Enquiries
        </Link>
        <h1 className="mt-2 text-h2">{enquiry.reference}</h1>
        <p className="mt-2 text-body text-muted">
          {topicLabel(enquiry.topic)}, received{" "}
          {formatDateTime(enquiry.createdAt)}.
        </p>
      </div>

      <Card className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {enquiry.handledAt ? (
            <p className="flex items-center gap-2">
              <Badge tone="success">Handled</Badge>
              <span className="text-body-sm text-muted">
                {formatDateTime(enquiry.handledAt)}
              </span>
            </p>
          ) : (
            <Badge tone="warning">Not handled</Badge>
          )}
          {enquiry.handledAt ? null : (
            <Button
              className="h-10"
              loading={handle.isPending}
              onClick={() => handle.mutate()}
            >
              Mark handled
            </Button>
          )}
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-body-sm text-muted">Name</dt>
            <dd>{enquiry.name}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Email</dt>
            <dd className="break-all">
              {enquiry.email ?? <span className="text-muted">Not given</span>}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Phone</dt>
            <dd>
              {enquiry.phone ?? <span className="text-muted">Not given</span>}
            </dd>
          </div>
        </dl>
        <section>
          <h2 className="text-title">Message</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-body">
            {enquiry.message}
          </p>
        </section>
      </Card>
    </div>
  );
}
