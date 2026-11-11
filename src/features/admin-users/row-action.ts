import type { Role, UserStatus } from "@/lib/api/types";

export type UserRowAction = "suspend" | "reinstate";

interface Viewer {
  id: string;
  role: Role;
}

/** Only super administrators change a user's status. The API decides; this hides buttons. */
export function canManageUsers(viewer: Viewer | undefined): boolean {
  return viewer?.role === "SUPER_ADMIN";
}

/**
 * The action a row offers the viewer: none for other roles, for the viewer's
 * own account, or for an account that has not been verified yet.
 */
export function rowAction(
  user: { id: string; status: UserStatus },
  viewer: Viewer | undefined,
): UserRowAction | null {
  if (!viewer || !canManageUsers(viewer) || user.id === viewer.id) return null;
  if (user.status === "ACTIVE") return "suspend";
  if (user.status === "SUSPENDED") return "reinstate";
  return null;
}

export interface RowActionPresentation {
  label: string;
  /** The status sent to the API. */
  status: "ACTIVE" | "SUSPENDED";
  title: string;
  description: (who: string) => string;
  confirmLabel: string;
  destructive: boolean;
  done: string;
}

export const ROW_ACTIONS: Record<UserRowAction, RowActionPresentation> = {
  suspend: {
    label: "Suspend",
    status: "SUSPENDED",
    title: "Suspend this user?",
    description: (who) =>
      `${who} is refused on their next request and cannot sign in until reinstated.`,
    confirmLabel: "Suspend user",
    destructive: true,
    done: "User suspended",
  },
  reinstate: {
    label: "Reinstate",
    status: "ACTIVE",
    title: "Reinstate this user?",
    description: (who) => `${who} will be able to sign in again.`,
    confirmLabel: "Reinstate user",
    destructive: false,
    done: "User reinstated",
  },
};
