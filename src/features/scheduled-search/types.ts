import type { Schemas } from "@/lib/api/types";

export type Cabin = Schemas["ScheduledCabin"];
export type ScheduledLocation = Schemas["ScheduledLocationDto"];
export type ScheduledSegment = Schemas["ScheduledSegmentDto"];
export type ScheduledOffer = Schemas["ScheduledOfferDto"];
export type ScheduledSearchResponse = Schemas["ScheduledSearchResponseDto"];
export type ScheduledSearchBody = Schemas["ScheduledSearchDto"];
export type FareRules = Schemas["ScheduledFareRulesDto"];
export type RevalidateResult = Schemas["ScheduledRevalidationDto"];
