import type { Metadata } from "next";
import { ProfileForm } from "@/features/account/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <>
      <h1 className="mb-6 text-h3">Profile</h1>
      <ProfileForm />
    </>
  );
}
