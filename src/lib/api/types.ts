import type { components } from "./generated/schema";

/**
 * Request and response shapes generated from the API's OpenAPI document.
 * Regenerate with `npm run api:types` after the API changes.
 */
export type Schemas = components["schemas"];

export type Role = Schemas["Role"];
export type UserStatus = Schemas["UserStatus"];
export type OperatorStatus = Schemas["OperatorStatus"];
export type Me = Schemas["MeResponseDto"];
export type User = Schemas["UserResponseDto"];
