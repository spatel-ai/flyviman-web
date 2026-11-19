import { ENQUIRY_TOPICS, type EnquiryTopic } from "@/content/contact";

export type HandledFilter = "ALL" | "UNHANDLED" | "HANDLED";
export type TopicFilter = EnquiryTopic | "ALL";

export interface EnquiryFilter {
  handled: HandledFilter;
  topic: TopicFilter;
  page: number;
}

export const PAGE_SIZE = 20;

const HANDLED: HandledFilter[] = ["ALL", "UNHANDLED", "HANDLED"];

export const HANDLED_OPTIONS: { value: HandledFilter; label: string }[] = [
  { value: "ALL", label: "All enquiries" },
  { value: "UNHANDLED", label: "Not handled" },
  { value: "HANDLED", label: "Handled" },
];

export const TOPIC_OPTIONS: { value: TopicFilter; label: string }[] = [
  { value: "ALL", label: "All topics" },
  ...ENQUIRY_TOPICS,
];

/** How a topic reads; an unknown value from a newer API shows as sent. */
export function topicLabel(topic: string): string {
  return ENQUIRY_TOPICS.find((known) => known.value === topic)?.label ?? topic;
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Reads the view from the URL. Anything not understood falls back to the default. */
export function parseEnquiryFilter(params: {
  get(name: string): string | null;
}): EnquiryFilter {
  const handled = params.get("handled");
  const topic = params.get("topic");
  return {
    handled: HANDLED.find((known) => known === handled) ?? "ALL",
    topic:
      ENQUIRY_TOPICS.find((known) => known.value === topic)?.value ?? "ALL",
    page: parsePage(params.get("page")),
  };
}

/** The query string for a view, without the "?". Defaults are left out. */
export function serialiseEnquiryFilter(filter: EnquiryFilter): string {
  const params = new URLSearchParams();
  if (filter.handled !== "ALL") params.set("handled", filter.handled);
  if (filter.topic !== "ALL") params.set("topic", filter.topic);
  if (filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** The query for `GET admin/enquiries`. */
export function enquiryListQuery(
  filter: EnquiryFilter,
): Record<string, string | number | undefined> {
  return {
    handled:
      filter.handled === "ALL"
        ? undefined
        : filter.handled === "HANDLED"
          ? "true"
          : "false",
    topic: filter.topic === "ALL" ? undefined : filter.topic,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
}

export function isFiltered(filter: EnquiryFilter): boolean {
  return filter.handled !== "ALL" || filter.topic !== "ALL";
}
