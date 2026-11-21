import type { Schemas } from "@/lib/api/types";

/**
 * What the signed-in operator user may do, as `GET /operator/me`
 * returns it (D-049, D-068). The API decides every request; this only keeps
 * the portal from offering what it would refuse.
 */
export type OperatorAccess = Schemas["OperatorAccessDto"];
export type Capability = OperatorAccess["capabilities"][number];
type OperatorStatus = Schemas["OperatorProfileResponseDto"]["status"];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  MANAGE_AIRCRAFT: "Manage aircraft",
  MANAGE_AVAILABILITY: "Manage availability",
  MANAGE_EMPTY_LEGS: "Manage empty legs",
  MANAGE_BOOKINGS: "Manage bookings",
};

export function isOperatorAdmin(access: OperatorAccess | undefined): boolean {
  return access?.role === "OPERATOR_ADMIN";
}

/**
 * Whether the user holds the capability, and, when an aircraft is named,
 * whether that aircraft is within their reach. False while loading.
 */
export function can(
  access: OperatorAccess | undefined,
  capability: Capability,
  aircraftId?: string,
): boolean {
  if (!access || !access.capabilities.includes(capability)) return false;
  if (aircraftId === undefined || access.allAircraft) return true;
  return access.aircraftIds.includes(aircraftId);
}

export interface PortalLink {
  href: string;
  label: string;
}

const DASHBOARD = { href: "/operator", label: "Dashboard" };
const REQUESTS = { href: "/operator/requests", label: "Requests" };
const FLEET = { href: "/operator/aircraft", label: "Fleet" };
const AVAILABILITY = { href: "/operator/availability", label: "Availability" };
const EMPTY_LEGS = { href: "/operator/empty-legs", label: "Empty legs" };
const AIR_AMBULANCE = {
  href: "/operator/air-ambulance",
  label: "Air ambulance",
};
const TEAM = { href: "/operator/team", label: "Team" };
const NOTIFICATIONS = {
  href: "/operator/notifications",
  label: "Notifications",
};
const PRICING = { href: "/operator/pricing", label: "Pricing" };
const SETTLEMENTS = { href: "/operator/settlements", label: "Settlements" };
const APPLICATION = {
  href: "/operator/onboarding",
  label: "Company and documents",
};

/**
 * The portal's navigation. Until the organisation is approved, only its
 * application is offered. A suspended operator keeps the fleet so it can
 * still ground an aircraft (D-058). Staff see only what their permissions
 * cover, and never the company, documents, team, settlements or air
 * ambulance missions (medical details: approved operators' administrators
 * only, W4-6).
 */
export function operatorNav(
  status: OperatorStatus,
  access: OperatorAccess,
): PortalLink[] {
  const live = status === "APPROVED" || status === "SUSPENDED";
  if (isOperatorAdmin(access)) {
    if (!live) return [APPLICATION];
    return status === "APPROVED"
      ? [
          DASHBOARD,
          REQUESTS,
          FLEET,
          AVAILABILITY,
          EMPTY_LEGS,
          AIR_AMBULANCE,
          PRICING,
          SETTLEMENTS,
          TEAM,
          NOTIFICATIONS,
          APPLICATION,
        ]
      : [
          FLEET,
          AVAILABILITY,
          PRICING,
          SETTLEMENTS,
          TEAM,
          NOTIFICATIONS,
          APPLICATION,
        ];
  }
  if (!live) return [];
  return [
    ...(status === "APPROVED" ? [DASHBOARD] : []),
    ...(status === "APPROVED" && can(access, "MANAGE_BOOKINGS")
      ? [REQUESTS]
      : []),
    ...(access.capabilities.length > 0 ? [FLEET] : []),
    ...(can(access, "MANAGE_AVAILABILITY") ? [AVAILABILITY] : []),
    ...(status === "APPROVED" && can(access, "MANAGE_EMPTY_LEGS")
      ? [EMPTY_LEGS]
      : []),
    NOTIFICATIONS,
  ];
}
