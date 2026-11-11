import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import type { OperatorProfile } from "./schema";

interface BannerText {
  message: string;
  /** Shown after the reviewer's reason, when there is one. */
  next?: string;
  showReason?: boolean;
}

const TEXT: Record<OperatorProfile["status"], BannerText> = {
  DRAFT: { message: "Complete the details below and submit for review." },
  PENDING_REVIEW: {
    message: "Under review. You cannot make changes until a decision is made.",
  },
  APPROVED: {
    message:
      "Your organisation is approved. Keep your details and documents up to date.",
  },
  REJECTED: {
    message: "Your application was not approved.",
    next: "Fix the points raised, then submit for review again.",
    showReason: true,
  },
  SUSPENDED: {
    message: "Your organisation is suspended.",
    next: "Contact support to resolve this.",
    showReason: true,
  },
};

/** Where the application stands, and what the operator can do about it. */
export function StatusBanner({ profile }: { profile: OperatorProfile }) {
  const text = TEXT[profile.status];
  return (
    <Card
      variant="raised"
      role="region"
      aria-label="Application status"
      className="flex flex-col gap-3"
    >
      <div>
        <StatusBadge kind="operator" status={profile.status} />
      </div>
      <p className="text-body text-foreground">{text.message}</p>
      {text.showReason && profile.reviewNote ? (
        <p className="text-body-sm wrap-break-word text-foreground">
          <span className="font-medium">Reason: </span>
          {profile.reviewNote}
        </p>
      ) : null}
      {text.next ? (
        <p className="text-body-sm text-muted">{text.next}</p>
      ) : null}
    </Card>
  );
}
