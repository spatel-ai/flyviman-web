"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/lib/api/use-me";
import { ItemsTab } from "./items-tab";
import { PoliciesTab } from "./policies-tab";
import { TemplatesTab } from "./templates-tab";

const TABS = ["banners", "faqs", "policies", "templates"] as const;
type Tab = (typeof TABS)[number];

export function ContentManager() {
  const router = useRouter();
  const param = useSearchParams().get("tab");
  const tab: Tab = TABS.find((name) => name === param) ?? "banners";
  const { data: me } = useMe();
  // Only hides what the API would refuse: publishing and wording are
  // super-admin only.
  const canEditWording = me?.role === "SUPER_ADMIN";

  return (
    <Tabs
      className="mt-6"
      value={tab}
      onValueChange={(next) =>
        router.replace(`/admin/content?tab=${next}`, { scroll: false })
      }
    >
      <TabsList aria-label="Content type">
        <TabsTrigger value="banners">Banners</TabsTrigger>
        <TabsTrigger value="faqs">Questions and answers</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
        <TabsTrigger value="templates">Notification templates</TabsTrigger>
      </TabsList>
      <TabsContent value="banners">
        <ItemsTab
          path="banners"
          noun="banner"
          titleLabel="Headline"
          bodyLabel="Message"
        />
      </TabsContent>
      <TabsContent value="faqs">
        <ItemsTab
          path="faqs"
          noun="question"
          titleLabel="Question"
          bodyLabel="Answer"
        />
      </TabsContent>
      <TabsContent value="policies">
        <PoliciesTab canEdit={canEditWording} />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesTab canEdit={canEditWording} />
      </TabsContent>
    </Tabs>
  );
}
