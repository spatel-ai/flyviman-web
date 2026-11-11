import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersList } from "@/features/admin-users/users-list";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <>
      <h1 className="text-h2">Users</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <UsersList />
      </Suspense>
    </>
  );
}
