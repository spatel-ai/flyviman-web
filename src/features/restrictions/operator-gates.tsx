import type { ReactNode } from "react";
import { NotApprovedState } from "@/components/shared/locked-state";
import { AdministratorOnly } from "@/features/operator-staff/administrator-only";
import type { Schemas } from "@/lib/api/types";
import {
  CAPABILITY_LABELS,
  can,
  isOperatorAdmin,
  type Capability,
} from "@/lib/operator-access";

type Me = Schemas["OperatorMeResponseDto"];

export interface GateNeeds {
  /** Only the organisation's administrator uses the page. */
  adminOnly?: boolean;
  /** A permission staff must hold (administrators hold every one). */
  capability?: Capability;
  /**
   * The organisation must be approved (`APPROVED`), or merely live (approved
   * or suspended, D-058). Name the one the API enforces for what the page does.
   */
  status?: "approved" | "live";
}

/**
 * The locked-state card for a page this user cannot use, or null when they
 * can. It only mirrors what the API refuses, to show the cause instead of a
 * form that can only fail; the API decides every call again, so a gap here
 * never grants access.
 */
export function operatorGate(
  operator: Me,
  title: string,
  needs: GateNeeds,
): ReactNode | null {
  const { access } = operator;
  if (needs.adminOnly && !isOperatorAdmin(access)) {
    return <AdministratorOnly title={title} />;
  }
  if (
    needs.capability &&
    !isOperatorAdmin(access) &&
    !can(access, needs.capability)
  ) {
    return (
      <AdministratorOnly
        title={title}
        reason={`Your administrator can give you the ${CAPABILITY_LABELS[needs.capability]} permission.`}
      />
    );
  }
  if (
    needs.capability &&
    !isOperatorAdmin(access) &&
    !access.allAircraft &&
    access.aircraftIds.length === 0
  ) {
    return (
      <AdministratorOnly
        title={title}
        reason="No aircraft are assigned to you yet. Your administrator chooses the aircraft you can manage."
      />
    );
  }
  const live =
    operator.status === "APPROVED" || operator.status === "SUSPENDED";
  if (
    (needs.status === "approved" && operator.status !== "APPROVED") ||
    (needs.status === "live" && !live)
  ) {
    return <NotApprovedState title={title} />;
  }
  return null;
}
