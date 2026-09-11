import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getTrustedMembership, getWorkspaceSummary, listPublishedAssessments, provisionOrganization, reviewEvidence, startAssessmentAttempt, submitAssessmentAttempt } from "./db";

const requireMembership = async (userId: number) => {
  const membership = await getTrustedMembership(userId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "No active organization membership" });
  return membership;
};

const requireRole = async (userId: number, roles: Array<"trainee" | "trainer" | "admin">) => {
  const membership = await requireMembership(userId);
  if (!roles.includes(membership.membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your organization role cannot perform this operation" });
  return membership;
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const result = await getWorkspaceSummary(ctx.user.id);
      if (!result) throw new TRPCError({ code: "FORBIDDEN", message: "Workspace is not provisioned for this account" });
      return result;
    }),
    provision: protectedProcedure.input(z.object({ name: z.string().min(3).max(180), slug: z.string().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the configured platform owner can provision the first organization" });
      if (await getTrustedMembership(ctx.user.id)) throw new TRPCError({ code: "CONFLICT", message: "An active workspace already exists for this account" });
      return provisionOrganization({ ownerUserId: ctx.user.id, ...input });
    }),
  }),
  assessmentGateway: router({
    listPublished: protectedProcedure.query(async ({ ctx }) => {
      const membership = await requireMembership(ctx.user.id);
      return listPublishedAssessments(membership.membership.organizationId);
    }),
    startAttempt: protectedProcedure.input(z.object({ assessmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const membership = await requireRole(ctx.user.id, ["trainee"]);
      return startAssessmentAttempt({ organizationId: membership.membership.organizationId, assessmentId: input.assessmentId, userId: ctx.user.id });
    }),
    submitAttempt: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), answers: z.record(z.string(), z.unknown()) })).mutation(async ({ ctx, input }) => {
      const membership = await requireRole(ctx.user.id, ["trainee"]);
      return submitAssessmentAttempt({ organizationId: membership.membership.organizationId, userId: ctx.user.id, ...input });
    }),
  }),
  evidenceGateway: router({
    review: protectedProcedure.input(z.object({ evidenceId: z.number().int().positive(), toStatus: z.enum(["verified", "rejected", "under_review"]), validatedLevel: z.number().int().min(0).max(4).optional(), notes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const membership = await requireRole(ctx.user.id, ["trainer", "admin"]);
      return reviewEvidence({ organizationId: membership.membership.organizationId, reviewerId: ctx.user.id, ...input });
    }),
  }),
  intelligenceGateway: router({
    explainRecommendation: protectedProcedure.input(z.object({ gap: z.string().max(180), targetLevel: z.number().int().min(0).max(4), currentLevel: z.number().int().min(0).max(4), courseTitle: z.string().max(220) })).mutation(async ({ input }) => {
      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You explain competency learning recommendations. Do not make verification, employment, approval, or eligibility decisions. Return one concise plain-text explanation grounded only in the provided facts." },
            { role: "user", content: `Gap: ${input.gap}\nCurrent level: ${input.currentLevel}\nTarget level: ${input.targetLevel}\nCourse: ${input.courseTitle}\nExplain why this course is relevant in one sentence.` },
          ],
          maxTokens: 120,
        });
        const content = result.choices[0]?.message.content;
        return { enabled: true as const, explanation: typeof content === "string" ? content : "This course is mapped to the competency gap and target level." };
      } catch {
        return { enabled: false as const, explanation: "This course is mapped to the competency gap and target level using deterministic rules." };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
