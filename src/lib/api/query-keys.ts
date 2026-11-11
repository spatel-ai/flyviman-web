/** Every TanStack Query key in one place, so invalidation cannot drift. */
export const queryKeys = {
  me: ["me"] as const,
  passengers: ["me", "passengers"] as const,
  notifications: (page: number) => ["me", "notifications", page] as const,
  policy: (slug: string) => ["policy", slug] as const,
  operatorProfile: ["operator", "profile"] as const,
  operatorDocuments: ["operator", "documents"] as const,
  adminOperators: (filter: object) => ["admin", "operators", filter] as const,
  adminOperator: (id: string) => ["admin", "operators", id] as const,
  adminUsers: (filter: object) => ["admin", "users", filter] as const,
  adminLocations: (filter: object) => ["admin", "locations", filter] as const,
};
