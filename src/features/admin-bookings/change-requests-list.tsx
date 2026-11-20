"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { ChangeRequestCard } from "./change-request-card";

type ChangeRequest = Schemas["ChangeRequestResponseDto"];

const PAGE_SIZE = 20;

function pageOf(value: string | null): number {
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

/** The open requests (the API's default view). Only operations and super administrators reach this page. */
export function ChangeRequestsList() {
  const router = useRouter();
  const page = pageOf(useSearchParams().get("page"));
  const filter = { page };

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminChangeRequests(filter),
    queryFn: () =>
      apiFetch<ChangeRequest[]>("admin/change-requests", {
        query: { page, pageSize: PAGE_SIZE },
      }),
  });

  if (isError) {
    return (
      <div className="mt-6">
        <LoadError
          what="the change requests"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="mt-6" aria-busy="true">
        <p role="status" className="sr-only">
          Loading change requests
        </p>
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (data.data.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No requests waiting"
          description="Change and cancellation requests from customers appear here until you answer them."
        />
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-4">
      {data.data.map((request) => (
        <ChangeRequestCard
          key={request.id}
          request={request}
          canDecide
          linkToBooking
        />
      ))}
      <Pagination
        page={page}
        pageSize={data.meta.pageSize ?? PAGE_SIZE}
        total={data.meta.total ?? 0}
        onPageChange={(next) =>
          router.replace(
            next > 1
              ? `/admin/change-requests?page=${next}`
              : "/admin/change-requests",
            { scroll: false },
          )
        }
      />
    </div>
  );
}
