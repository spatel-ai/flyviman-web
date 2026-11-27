import type { Metadata } from "next";
import { operatorGate } from "@/features/restrictions/operator-gates";
import { TeamList } from "@/features/operator-staff/team-list";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Team" };

export default async function OperatorTeamPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Staff can only be invited by an approved operator.
  const locked = operatorGate(operator, "Team", {
    adminOnly: true,
    status: "live",
  });
  if (locked) return locked;
  return (
    <>
      <h1 className="text-h2">Team</h1>
      <p className="mt-2 max-w-prose text-muted">
        Invite the people who manage your aircraft and their availability. Each
        person sees only the aircraft you assign to them.
      </p>
      <TeamList approved={operator.status === "APPROVED"} />
    </>
  );
}
