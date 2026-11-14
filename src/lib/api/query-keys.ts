/** Every TanStack Query key in one place, so invalidation cannot drift. */
export const queryKeys = {
  me: ["me"] as const,
  passengers: ["me", "passengers"] as const,
  notifications: (page: number) => ["me", "notifications", page] as const,
  policy: (slug: string) => ["policy", slug] as const,
  operatorProfile: ["operator", "profile"] as const,
  /** Under operatorProfile, so refreshing the profile refreshes this too. */
  operatorMe: ["operator", "profile", "me"] as const,
  operatorDocuments: ["operator", "documents"] as const,
  adminOperators: (filter: object) => ["admin", "operators", filter] as const,
  adminOperator: (id: string) => ["admin", "operators", id] as const,
  adminUsers: (filter: object) => ["admin", "users", filter] as const,
  adminLocations: (filter: object) => ["admin", "locations", filter] as const,
  adminExpiringDocuments: (filter: object) =>
    ["admin", "documents", "expiring", filter] as const,
  operatorAircraft: ["operator", "aircraft"] as const,
  operatorAircraftDetail: (id: string) => ["operator", "aircraft", id] as const,
  /** Every aircraft in reach, for pickers (under the operatorAircraft prefix). */
  operatorAircraftAll: ["operator", "aircraft", "all"] as const,
  operatorStaff: ["operator", "staff"] as const,
  operatorPricing: ["operator", "pricing"] as const,
  aircraftPricing: (id: string) =>
    ["operator", "aircraft", id, "pricing"] as const,
  adminAircraft: (status: string) => ["admin", "aircraft", status] as const,
  adminAircraftDetail: (id: string) => ["admin", "aircraft", id] as const,
  locationSearch: (q: string) => ["locations", "search", q] as const,
  search: (id: string) => ["search", id] as const,
  searchResult: (searchId: string, resultId: string) =>
    ["search", searchId, "results", resultId] as const,
  location: (id: string) => ["locations", "one", id] as const,
  locationByCode: (code: string) => ["locations", "code", code] as const,
  fareCalendar: (params: object) => ["search", "calendar", params] as const,
  fileDownload: (fileId: string) => ["files", fileId, "download"] as const,
  /** Every availability key starts with this, so one invalidation covers all. */
  availability: ["operator", "availability"] as const,
  fleetAvailability: (from: string, to: string) =>
    ["operator", "availability", "fleet", from, to] as const,
  aircraftAvailability: (id: string, from: string, to: string) =>
    ["operator", "availability", "aircraft", id, from, to] as const,
  availabilityConflicts: ["operator", "availability", "conflicts"] as const,
};
