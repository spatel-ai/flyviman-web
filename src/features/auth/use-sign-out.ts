"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";

/** Ends the session, forgets cached data, and returns to sign-in. */
export function useSignOut() {
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
    // A full navigation, not router.replace + refresh: the soft refresh left
    // the portal layout mounted, and its links prefetched protected pages
    // again, which the proxy redirected to /login?next=... (404 in the
    // console). Leaving the document unmounts them first.
    window.location.replace("/login");
  }

  return { signOut, pending };
}
