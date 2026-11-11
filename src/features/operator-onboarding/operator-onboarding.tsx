"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { CompanyDetailsForm } from "./company-details-form";
import { DocumentsSection } from "./documents-section";
import { onboardingMessage } from "./messages";
import { isSubmittable, type OperatorProfile } from "./schema";
import { StatusBanner } from "./status-banner";
import { SubmitSection } from "./submit-section";

function LoadingState() {
  return (
    <div
      role="status"
      aria-label="Loading your application"
      className="flex flex-col gap-6"
    >
      <Card variant="raised" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-full max-w-md" />
      </Card>
      <Card variant="raised" className="flex flex-col gap-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </Card>
      <Card variant="raised" className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
      </Card>
    </div>
  );
}

/** The operator's application: status, company details, documents, submit. */
export function OperatorOnboarding() {
  const profile = useQuery({
    queryKey: queryKeys.operatorProfile,
    queryFn: async () =>
      (await apiFetch<OperatorProfile>("operator/profile")).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2">Company and documents</h1>

      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <Card
          variant="raised"
          role="alert"
          className="flex flex-col items-start gap-3"
        >
          <p className="text-body-sm text-danger">
            We could not load your application.{" "}
            {onboardingMessage(profile.error)}
          </p>
          <Button
            variant="secondary"
            size="sm"
            loading={profile.isRefetching}
            onClick={() => void profile.refetch()}
          >
            Retry
          </Button>
        </Card>
      ) : (
        <>
          <StatusBanner profile={profile.data} />

          <Card variant="raised">
            <section aria-labelledby="company-details-heading">
              <h2 id="company-details-heading" className="mb-6 text-title">
                Company details
              </h2>
              <CompanyDetailsForm profile={profile.data} />
            </section>
          </Card>

          <Card variant="raised">
            <section aria-labelledby="documents-heading">
              <h2 id="documents-heading" className="text-title">
                Documents
              </h2>
              <p className="mt-1 mb-6 text-body-sm text-muted">
                An air operator certificate and an insurance certificate are
                required.
              </p>
              <DocumentsSection
                editable={profile.data.status !== "PENDING_REVIEW"}
              />
            </section>
          </Card>

          {isSubmittable(profile.data.status) ? (
            <Card variant="raised">
              <section aria-labelledby="submit-heading">
                <h2 id="submit-heading" className="mb-4 text-title">
                  Submit for review
                </h2>
                <SubmitSection profile={profile.data} />
              </section>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
