import type { Metadata } from "next";
import { AdministratorOnly } from "@/features/operator-staff/administrator-only";
import { TeamList } from "@/features/operator-staff/team-list";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Team" };

export default async function OperatorTeamPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  if (operator.access.role !== "OPERATOR_ADMIN") {
    return <AdministratorOnly title="Team" />;
  }
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
