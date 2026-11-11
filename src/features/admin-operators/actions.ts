import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import type { OperatorStatus, Role } from "@/lib/api/types";

export type OperatorAction = "approve" | "reject" | "suspend" | "reinstate";

const REVIEWERS: readonly Role[] = ["OPS", "SUPER_ADMIN"];

/** Finance is read-only. This only hides buttons; the API decides. */
export function canReview(role: Role | undefined): boolean {
  return role !== undefined && REVIEWERS.includes(role);
}

const BY_STATUS: Record<OperatorStatus, OperatorAction[]> = {
  DRAFT: [],
  PENDING_REVIEW: ["approve", "reject"],
  APPROVED: ["suspend"],
  REJECTED: [],
  SUSPENDED: ["reinstate"],
};

/** The decisions a viewer can take on an operator, primary action first. */
export function availableActions(
  status: OperatorStatus,
  role: Role | undefined,
): OperatorAction[] {
  if (!canReview(role)) return [];
  return Object.hasOwn(BY_STATUS, status) ? BY_STATUS[status] : [];
}

export interface ActionPresentation {
  /** The button on the page. */
  label: string;
  primary: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  requireReason: boolean;
  /** Toast shown once the action has gone through. */
  done: string;
}

export const ACTIONS: Record<OperatorAction, ActionPresentation> = {
  approve: {
    label: "Approve",
    primary: true,
    title: "Approve this operator?",
    description:
      "The operator is told by email and can start listing aircraft and receiving requests.",
    confirmLabel: "Approve operator",
    destructive: false,
    requireReason: false,
    done: "Operator approved",
  },
  reject: {
    label: "Reject application",
    primary: false,
    title: "Reject this application?",
    description:
      "The operator sees your reason, and can correct the application and submit it again.",
    confirmLabel: "Confirm rejection",
    destructive: true,
    requireReason: true,
    done: "Application rejected",
  },
  suspend: {
    label: "Suspend",
    primary: false,
    title: "Suspend this operator?",
    description:
      "The operator's inventory stops being bookable until they are reinstated. The operator sees your reason.",
    confirmLabel: "Suspend operator",
    destructive: true,
    requireReason: true,
    done: "Operator suspended",
  },
  reinstate: {
    label: "Reinstate",
    primary: true,
    title: "Reinstate this operator?",
    description:
      "The operator is approved again and their inventory becomes bookable.",
    confirmLabel: "Reinstate operator",
    destructive: false,
    requireReason: false,
    done: "Operator reinstated",
  },
};

export const REASON_TOO_SHORT = "Give a reason of at least 3 characters.";

/** What to tell the reviewer when a decision or document check is refused. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "OPERATOR_DOCUMENTS_UNVERIFIED":
        return "Verify the required documents first";
      case "OPERATOR_INVALID_TRANSITION":
        return "Someone else has already acted on this operator. This page now shows its latest status.";
      case "NOT_FOUND":
        return "This no longer exists. It may have been removed.";
      case "FORBIDDEN":
        return "Your role cannot do this.";
      case "VALIDATION_ERROR":
        return REASON_TOO_SHORT;
    }
  }
  return messageFor(error);
}

/** Refusals that mean the page is out of date and should be loaded again. */
export function isStale(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "OPERATOR_INVALID_TRANSITION" || error.code === "NOT_FOUND")
  );
}
