import type { Schemas } from "@/lib/api/types";

/** The public offer (`GET /empty-legs`). */
export type EmptyLegOffer = Schemas["EmptyLegResponseDto"];
/** The public detail, with whether the signed-in customer follows it. */
export type EmptyLegDetail = Schemas["EmptyLegDetailResponseDto"];
/** The operator's own offer, with what they may do to it. */
export type OperatorEmptyLeg = Schemas["OperatorEmptyLegResponseDto"];
/** An offer as operations see it. */
export type AdminEmptyLeg = Schemas["AdminEmptyLegResponseDto"];
export type EmptyLegAircraft = Schemas["OperatorEmptyLegAircraftDto"];
export type EmptyLegInput = Schemas["CreateEmptyLegDto"];
export type EmptyLegLocation = Schemas["EmptyLegLocationDto"];
