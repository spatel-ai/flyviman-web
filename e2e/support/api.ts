import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_URL = `http://localhost:${process.env.API_PORT ?? 4000}/api/v1/`;

/** Values from flyviman-api's `.env`, where the seed's passwords live. */
function apiEnv(): Record<string, string> {
  const file = readFileSync(
    resolve(__dirname, "../../../flyviman-api/.env"),
    "utf8",
  );
  return Object.fromEntries(
    file
      .split("\n")
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const env = apiEnv();

/** Accounts created by `npm run db:seed` in flyviman-api. */
export const ACCOUNTS = {
  superAdmin: {
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
  },
  ops: { email: "ops@flyviman.test", password: env.SEED_LOCAL_PASSWORD },
  finance: {
    email: "finance@flyviman.test",
    password: env.SEED_LOCAL_PASSWORD,
  },
  customer: {
    email: "customer@flyviman.test",
    password: env.SEED_LOCAL_PASSWORD,
  },
  operatorAdmin: {
    email: "operator@flyviman.test",
    password: env.SEED_LOCAL_PASSWORD,
  },
} as const;
export type AccountName = keyof typeof ACCOUNTS;

/** A password that passes the policy. */
export const PASSWORD = "correct horse battery staple";

export function unique(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function uniqueEmail(prefix = "user"): string {
  return `${unique(prefix)}@flyviman.test`;
}

interface OutboxMessage {
  subject?: string;
  body: string;
}

async function outbox(
  request: APIRequestContext,
  to: string,
): Promise<OutboxMessage[]> {
  const response = await request.get(`${API_URL}dev/outbox`, {
    params: { to },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

/** The most recent six-digit code the messaging mock "sent" to an address. */
export async function latestCode(
  request: APIRequestContext,
  to: string,
): Promise<string> {
  await expect
    .poll(async () =>
      (await outbox(request, to)).some((m) => /\b\d{6}\b/.test(m.body)),
    )
    .toBe(true);
  const messages = await outbox(request, to);
  return messages.map((m) => /\b(\d{6})\b/.exec(m.body)?.[1]).find(Boolean)!;
}

/** The most recent emailed link to the reset-password page, as a path. */
export async function latestPasswordLink(
  request: APIRequestContext,
  to: string,
): Promise<string> {
  await expect
    .poll(async () =>
      (await outbox(request, to)).some((m) =>
        m.body.includes("/reset-password?token="),
      ),
    )
    .toBe(true);
  const messages = await outbox(request, to);
  const link = messages
    .map((m) => /(\/reset-password\?token=[\w%-]+)/.exec(m.body)?.[1])
    .find(Boolean);
  return link!;
}

/** Signs in through the sign-in page. */
export async function signIn(
  page: Page,
  account: AccountName | { email: string; password: string },
  next?: string,
) {
  const { email, password } =
    typeof account === "string" ? ACCOUNTS[account] : account;
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** No part of the page is wider than the screen. */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** The draft organisation the seed creates for the local operator account. */
export const SEEDED_OPERATOR = "Local Test Aviation Private Limited";
