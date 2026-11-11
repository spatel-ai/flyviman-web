import type { Metadata } from "next";
import { ProfileForm } from "@/features/account/profile-form";
import { PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <PageTransition>
      <h1 className="mb-6 text-h3">Profile</h1>
      <ProfileForm />
    </PageTransition>
  );
}
