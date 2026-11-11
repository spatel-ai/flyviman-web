import type { Metadata } from "next";
import { Passengers } from "@/features/account/passengers";

export const metadata: Metadata = { title: "Saved passengers" };

export default function Page() {
  return (
    <>
      <h1 className="mb-6 text-h3">Saved passengers</h1>
      <Passengers />
    </>
  );
}
