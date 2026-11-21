/** Every TanStack Query key in one place, so invalidation cannot drift. */
export const queryKeys = {
  me: ["me"] as const,
  /** Every trip list key starts with ["trips"]. */
  tripsAll: ["trips"] as const,
  trips: (view: string, page: number) => ["trips", view, page] as const,
  /** The account overview's own read of upcoming trips (under tripsAll). */
  tripsOverview: ["trips", "overview"] as const,
  /** Every key for one booking starts with ["bookings", reference]. */
  booking: (reference: string) => ["bookings", reference] as const,
  bookingQuotes: (reference: string) =>
    ["bookings", reference, "quotes"] as const,
  bookingMessages: (reference: string) =>
    ["bookings", reference, "messages"] as const,
  bookingEvents: (reference: string) =>
    ["bookings", reference, "events"] as const,
  paymentReceipt: (reference: string) =>
    ["payments", reference, "receipt"] as const,
  bookingPayments: (reference: string) =>
    ["bookings", reference, "payments"] as const,
  bookingDocuments: (reference: string) =>
    ["bookings", reference, "documents"] as const,
  cancellationQuote: (reference: string) =>
    ["bookings", reference, "cancellation-quote"] as const,
  passengers: ["me", "passengers"] as const,
  notificationsAll: ["me", "notifications"] as const,
  notifications: (page: number) => ["me", "notifications", page] as const,
  policy: (slug: string) => ["policy", slug] as const,
  operatorProfile: ["operator", "profile"] as const,
  /** Under operatorProfile, so refreshing the profile refreshes this too. */
  operatorMe: ["operator", "profile", "me"] as const,
  operatorDocuments: ["operator", "documents"] as const,
  adminOperators: (filter: object) => ["admin", "operators", filter] as const,
  adminOperator: (id: string) => ["admin", "operators", id] as const,
  adminUsers: (filter: object) => ["admin", "users", filter] as const,
  adminRoles: ["admin", "roles"] as const,
  /** Prefix of every admin booking key (lists and details). */
  adminBookingsAll: ["admin", "bookings"] as const,
  adminBookings: (filter: object) => ["admin", "bookings", filter] as const,
  adminBooking: (reference: string) =>
    ["admin", "bookings", reference] as const,
  adminChangeRequestsAll: ["admin", "change-requests"] as const,
  adminChangeRequests: (filter: object) =>
    ["admin", "change-requests", filter] as const,
  adminStaffOwners: ["admin", "users", "booking-owners"] as const,
  adminEnquiriesAll: ["admin", "enquiries"] as const,
  adminEnquiries: (filter: object) => ["admin", "enquiries", filter] as const,
  adminEnquiry: (id: string) => ["admin", "enquiries", id] as const,
  /** Every content key starts with ["admin", "content"]. */
  adminContent: (part: string) => ["admin", "content", part] as const,
  adminPayments: (filter: object) => ["admin", "payments", filter] as const,
  /** Every refund key starts with ["admin", "refunds"]. */
  adminRefundsAll: ["admin", "refunds"] as const,
  adminRefunds: (page: number) =>
    ["admin", "refunds", "history", page] as const,
  adminRefundsDue: (page: number) => ["admin", "refunds", "due", page] as const,
  adminReport: (report: string, filter: object) =>
    ["admin", "reports", report, filter] as const,
  /** Every settlement key starts with ["admin", "settlements"]. */
  adminSettlementsAll: ["admin", "settlements"] as const,
  adminSettlements: (filter: object) =>
    ["admin", "settlements", filter] as const,
  adminReconciliation: (period: object) =>
    ["admin", "reconciliation", period] as const,
  adminAuditLogs: (filter: object) => ["admin", "audit-logs", filter] as const,
  adminLocations: (filter: object) => ["admin", "locations", filter] as const,
  adminExpiringDocuments: (filter: object) =>
    ["admin", "documents", "expiring", filter] as const,
  operatorDashboard: ["operator", "dashboard"] as const,
  operatorSettlements: (page: number) =>
    ["operator", "settlements", page] as const,
  operatorAircraft: ["operator", "aircraft"] as const,
  operatorAircraftDetail: (id: string) => ["operator", "aircraft", id] as const,
  /** Every aircraft in reach, for pickers (under the operatorAircraft prefix). */
  operatorAircraftAll: ["operator", "aircraft", "all"] as const,
  /** Every request key starts with ["operator", "requests"]. */
  operatorRequests: (filter: object) =>
    ["operator", "requests", "list", filter] as const,
  operatorRequestsAll: ["operator", "requests"] as const,
  operatorRequest: (reference: string) =>
    ["operator", "requests", "one", reference] as const,
  /** Every operator booking key starts with ["operator", "bookings"]. */
  operatorBookings: (filter: object) =>
    ["operator", "bookings", "list", filter] as const,
  operatorBookingsAll: ["operator", "bookings"] as const,
  operatorBooking: (reference: string) =>
    ["operator", "bookings", "one", reference] as const,
  operatorStaff: ["operator", "staff"] as const,
  operatorPricing: ["operator", "pricing"] as const,
  operatorRestrictions: ["operator", "restrictions"] as const,
  aircraftPricing: (id: string) =>
    ["operator", "aircraft", id, "pricing"] as const,
  /** Prefix of every pricing rule key (rules and matching limits share it). */
  adminPricingRulesAll: ["admin", "pricing-rules"] as const,
  adminMatchingLimits: ["admin", "pricing-rules", "matching-limits"] as const,
  adminCancellationTerms: ["admin", "cancellation-terms"] as const,
  /** Every pricing rule key starts with ["admin", "pricing-rules"]. */
  adminPricingRules: (filter: object) =>
    ["admin", "pricing-rules", filter] as const,
  /** Every promotion key starts with ["admin", "promotions"]. */
  adminPromotionsAll: ["admin", "promotions"] as const,
  adminPromotions: (filter: object) => ["admin", "promotions", filter] as const,
  adminOperatorPricing: (id: string) =>
    ["admin", "operators", id, "pricing"] as const,
  adminPriceCalculations: (filter: object) =>
    ["admin", "price-calculations", "list", filter] as const,
  adminPriceCalculation: (id: string) =>
    ["admin", "price-calculations", id] as const,
  adminAircraftAll: ["admin", "aircraft"] as const,
  adminAircraft: (status: string) => ["admin", "aircraft", status] as const,
  adminAircraftDetail: (id: string) => ["admin", "aircraft", id] as const,
  emptyLegs: (filter: string) => ["empty-legs", "list", filter] as const,
  emptyLeg: (id: string) => ["empty-legs", "one", id] as const,
  operatorEmptyLegs: ["operator", "empty-legs"] as const,
  operatorEmptyLeg: (id: string) => ["operator", "empty-legs", id] as const,
  adminEmptyLegsAll: ["admin", "empty-legs"] as const,
  adminEmptyLegs: (status: string) => ["admin", "empty-legs", status] as const,
  locationSearch: (q: string) => ["locations", "search", q] as const,
  search: (id: string) => ["search", id] as const,
  searchResult: (searchId: string, resultId: string) =>
    ["search", searchId, "results", resultId] as const,
  scheduledSearch: (id: string) => ["scheduled-search", id] as const,
  scheduledFareRules: (searchId: string, offerId: string) =>
    ["scheduled-search", searchId, "fare-rules", offerId] as const,
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
  /** Air ambulance (W4-6). Medical reads are never kept (gcTime 0). */
  airAmbulanceListAll: ["air-ambulance", "list"] as const,
  airAmbulanceRequests: (page: number) =>
    ["air-ambulance", "list", page] as const,
  airAmbulanceRequest: (reference: string) =>
    ["air-ambulance", "one", reference] as const,
  adminAirAmbulanceListAll: ["admin", "air-ambulance", "list"] as const,
  adminAirAmbulanceRequests: (filter: object) =>
    ["admin", "air-ambulance", "list", filter] as const,
  adminAirAmbulanceRequest: (reference: string) =>
    ["admin", "air-ambulance", "one", reference] as const,
  adminAirAmbulanceOperators: ["admin", "air-ambulance", "operators"] as const,
  operatorAirAmbulanceRequests: (page: number) =>
    ["operator", "air-ambulance", "list", page] as const,
  operatorAirAmbulanceRequest: (reference: string) =>
    ["operator", "air-ambulance", "one", reference] as const,
};
