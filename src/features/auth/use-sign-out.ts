"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";

/** Ends the session, forgets cached data, and returns to sign-in. */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await apiFetch("auth/logout", { method: "POST" });
    } catch {
      // Already signed out, or unreachable: leave the signed-in pages anyway.
    }
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  return { signOut, pending };
}
