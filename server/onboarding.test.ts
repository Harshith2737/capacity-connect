import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  const now = new Date();
  return {
    user: { id: 1, openId: "unaffiliated-user", name: "Admin", email: "admin@example.com", loginMethod: "google", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("unaffiliated onboarding reads", () => {
  it("returns empty onboarding-safe values instead of membership errors", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.workspace.summary()).resolves.toBeNull();
    await expect(caller.assessmentGateway.listPublished()).resolves.toEqual([]);
  });
});
