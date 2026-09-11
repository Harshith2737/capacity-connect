import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, assessments, assessmentAttempts, assessmentQuestions, assessmentReviews, auditLogs, evidence, evidenceReviews, memberships, users, userCompetencies, competencies, organizations, courses, enrollments, departments, roles, roleCompetencyRequirements } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getTrustedMembership(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ membership: memberships, organization: organizations }).from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active"))).limit(1);
  return result[0];
}

export async function provisionOrganization(input: { ownerUserId: number; name: string; slug: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(organizations).where(eq(organizations.slug, input.slug)).limit(1);
  if (existing[0]) throw new Error("Organization slug is already in use");
  await db.insert(organizations).values({ name: input.name, slug: input.slug, mode: "imd_government", status: "active" });
  const organization = await db.select().from(organizations).where(eq(organizations.slug, input.slug)).limit(1);
  if (!organization[0]) throw new Error("Organization could not be created");
  await db.insert(memberships).values({ organizationId: organization[0].id, userId: input.ownerUserId, role: "admin", status: "active", approvedAt: new Date() });
  await recordAudit({ organizationId: organization[0].id, actorUserId: input.ownerUserId, action: "organization.provisioned", targetType: "organization", targetId: String(organization[0].id), after: { name: input.name, slug: input.slug } });
  return organization[0];
}

export async function getWorkspaceSummary(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const trusted = await getTrustedMembership(userId);
  if (!trusted) return undefined;
  const organizationId = trusted.membership.organizationId;
  const [competencyRows, assessmentRows, evidenceRows, courseRows, enrollmentRows, departmentRows, roleRows, requirementRows, userCompetencyRows] = await Promise.all([
    db.select().from(competencies).where(eq(competencies.organizationId, organizationId)).limit(100),
    db.select().from(assessments).where(eq(assessments.organizationId, organizationId)).limit(100),
    db.select().from(evidence).where(eq(evidence.organizationId, organizationId)).orderBy(desc(evidence.submittedAt)).limit(100),
    db.select().from(courses).where(eq(courses.organizationId, organizationId)).limit(100),
    db.select().from(enrollments).where(eq(enrollments.organizationId, organizationId)).limit(100),
    db.select().from(departments).where(eq(departments.organizationId, organizationId)).limit(100),
    db.select().from(roles).where(eq(roles.organizationId, organizationId)).limit(100),
    db.select().from(roleCompetencyRequirements).where(eq(roleCompetencyRequirements.organizationId, organizationId)).limit(200),
    db.select({ record: userCompetencies, competency: competencies }).from(userCompetencies).innerJoin(competencies, eq(userCompetencies.competencyId, competencies.id)).where(and(eq(userCompetencies.organizationId, organizationId), eq(userCompetencies.userId, userId))).limit(100),
  ]);
  return { organization: trusted.organization, membership: trusted.membership, competencies: competencyRows, assessments: assessmentRows, evidence: evidenceRows, courses: courseRows, enrollments: enrollmentRows, departments: departmentRows, roles: roleRows, requirements: requirementRows, userCompetencies: userCompetencyRows };
}

export async function recordAudit(input: { organizationId?: number; actorUserId?: number; action: string; targetType: string; targetId?: string; requestId?: string; before?: unknown; after?: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(auditLogs).values({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: input.action, targetType: input.targetType, targetId: input.targetId, requestId: input.requestId, beforeJson: input.before ? JSON.stringify(input.before) : undefined, afterJson: input.after ? JSON.stringify(input.after) : undefined });
}

export async function listPublishedAssessments(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assessments).where(and(eq(assessments.organizationId, organizationId), eq(assessments.status, "published"))).limit(100);
}

export async function startAssessmentAttempt(input: { organizationId: number; assessmentId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const assessment = await db.select().from(assessments).where(and(eq(assessments.id, input.assessmentId), eq(assessments.organizationId, input.organizationId), eq(assessments.status, "published"))).limit(1);
  if (!assessment[0]) throw new Error("Published assessment not found in organization");
  const existing = await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.assessmentId, input.assessmentId), eq(assessmentAttempts.userId, input.userId))).limit(assessment[0].attemptLimit + 1);
  if (existing.length >= assessment[0].attemptLimit) throw new Error("Assessment attempt limit reached");
  await db.insert(assessmentAttempts).values({ ...input, status: "started" });
  const created = await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.assessmentId, input.assessmentId), eq(assessmentAttempts.userId, input.userId))).orderBy(desc(assessmentAttempts.id)).limit(1);
  return created[0];
}

export function hashAnswer(answer: unknown): string {
  const normalized = typeof answer === "string" ? answer.trim().toLowerCase() : JSON.stringify(answer);
  return createHash("sha256").update(normalized).digest("hex");
}

export async function submitAssessmentAttempt(input: { organizationId: number; attemptId: number; userId: number; answers: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const attempt = await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.id, input.attemptId), eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.userId, input.userId))).limit(1);
  if (!attempt[0] || attempt[0].status !== "started") throw new Error("Assessment attempt is invalid or already submitted");
  const assessment = await db.select().from(assessments).where(and(eq(assessments.id, attempt[0].assessmentId), eq(assessments.organizationId, input.organizationId))).limit(1);
  const questions = await db.select().from(assessmentQuestions).where(and(eq(assessmentQuestions.assessmentId, attempt[0].assessmentId), eq(assessmentQuestions.organizationId, input.organizationId))).limit(200);
  if (!assessment[0]) throw new Error("Assessment not found");
  const requiresReview = assessment[0].assessmentType === "practical_task" || assessment[0].assessmentType === "rubric" || assessment[0].assessmentType === "short_answer";
  if (questions.length === 0 && !requiresReview) throw new Error("Assessment has no scorable questions");
  let earned = 0;
  let possible = 0;
  for (const question of questions) {
    possible += question.points;
    if (question.answerKeyHash && input.answers[String(question.id)] !== undefined && hashAnswer(input.answers[String(question.id)]) === question.answerKeyHash) earned += question.points;
  }
  const scorePercent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const passed = requiresReview ? undefined : scorePercent >= assessment[0].passMarkPercent;
  await db.update(assessmentAttempts).set({ status: requiresReview ? "submitted" : "scored", reviewStatus: requiresReview ? "pending" : "not_required", answersJson: JSON.stringify(input.answers), scorePercent: requiresReview ? null : scorePercent, passed: passed === undefined ? null : passed ? 1 : 0, submittedAt: new Date(), scoredAt: requiresReview ? null : new Date() }).where(and(eq(assessmentAttempts.id, input.attemptId), eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.userId, input.userId)));
  await recordAudit({ organizationId: input.organizationId, actorUserId: input.userId, action: requiresReview ? "assessment.submitted_for_review" : "assessment.scored", targetType: "assessment_attempt", targetId: String(input.attemptId), after: { scorePercent: requiresReview ? null : scorePercent, passed, reviewStatus: requiresReview ? "pending" : "not_required" } });
  return { attemptId: input.attemptId, status: requiresReview ? "submitted" as const : "scored" as const, scorePercent: requiresReview ? undefined : scorePercent, passed, reviewStatus: requiresReview ? "pending" as const : "not_required" as const };
}

export async function reviewEvidence(input: { organizationId: number; evidenceId: number; reviewerId: number; toStatus: "verified" | "rejected" | "under_review"; validatedLevel?: number; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await db.select().from(evidence).where(and(eq(evidence.id, input.evidenceId), eq(evidence.organizationId, input.organizationId))).limit(1);
  if (!current[0]) throw new Error("Evidence not found in organization");
  const nextStatus = input.toStatus;
  await db.update(evidence).set({ status: nextStatus, verifiedAt: nextStatus === "verified" ? new Date() : null }).where(and(eq(evidence.id, input.evidenceId), eq(evidence.organizationId, input.organizationId)));
  await db.insert(evidenceReviews).values({ organizationId: input.organizationId, evidenceId: input.evidenceId, reviewerId: input.reviewerId, fromStatus: current[0].status, toStatus: nextStatus, validatedLevel: input.validatedLevel, notes: input.notes });
  if (nextStatus === "verified" && input.validatedLevel !== undefined) {
    const existing = await db.select().from(userCompetencies).where(and(eq(userCompetencies.organizationId, input.organizationId), eq(userCompetencies.userId, current[0].userId), eq(userCompetencies.competencyId, current[0].competencyId))).limit(1);
    if (existing[0]) {
      await db.update(userCompetencies).set({ validatedLevel: Math.max(existing[0].validatedLevel, input.validatedLevel), evidenceState: "trainer_verified", verifiedAt: new Date() }).where(eq(userCompetencies.id, existing[0].id));
    } else {
      await db.insert(userCompetencies).values({ organizationId: input.organizationId, userId: current[0].userId, competencyId: current[0].competencyId, currentLevel: input.validatedLevel, validatedLevel: input.validatedLevel, evidenceState: "trainer_verified", verifiedAt: new Date() });
    }
  }
  await recordAudit({ organizationId: input.organizationId, actorUserId: input.reviewerId, action: "evidence.reviewed", targetType: "evidence", targetId: String(input.evidenceId), before: current[0], after: { status: nextStatus, validatedLevel: input.validatedLevel } });
  return { success: true as const, fromStatus: current[0].status, toStatus: nextStatus };
}

export async function createEvidenceRecord(input: {
  organizationId: number;
  userId: number;
  competencyId: number;
  title: string;
  evidenceType: "certificate" | "qualification" | "work_experience" | "project" | "practical_task" | "trainer_evaluation" | "uploaded_artifact";
  claimedLevel: number;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  scanStatus: "clean" | "quarantined" | "failed";
  scanProvider: string;
  scanMessage: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const status = input.scanStatus === "clean" ? "submitted" : "rejected";
  await db.insert(evidence).values({ ...input, status, submittedAt: new Date(), scannedAt: new Date() });
  const created = await db.select().from(evidence).where(and(eq(evidence.organizationId, input.organizationId), eq(evidence.userId, input.userId), eq(evidence.sha256, input.sha256))).orderBy(desc(evidence.id)).limit(1);
  await recordAudit({ organizationId: input.organizationId, actorUserId: input.userId, action: input.scanStatus === "clean" ? "evidence.uploaded" : "evidence.quarantined", targetType: "evidence", targetId: created[0] ? String(created[0].id) : undefined, after: { title: input.title, scanStatus: input.scanStatus, scanProvider: input.scanProvider } });
  return created[0];
}

export async function listEvidenceForReview(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evidence).where(and(eq(evidence.organizationId, organizationId), eq(evidence.status, "submitted"))).orderBy(desc(evidence.submittedAt)).limit(100);
}

export async function getAssessmentAttemptDetail(input: { organizationId: number; attemptId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const attempt = await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.id, input.attemptId), eq(assessmentAttempts.userId, input.userId))).limit(1);
  if (!attempt[0]) throw new Error("Assessment attempt not found");
  const assessment = await db.select().from(assessments).where(and(eq(assessments.organizationId, input.organizationId), eq(assessments.id, attempt[0].assessmentId))).limit(1);
  const questions = await db.select().from(assessmentQuestions).where(and(eq(assessmentQuestions.organizationId, input.organizationId), eq(assessmentQuestions.assessmentId, attempt[0].assessmentId))).orderBy(assessmentQuestions.position).limit(200);
  return { attempt: attempt[0], assessment: assessment[0], questions: questions.map(({ answerKeyHash: _answerKeyHash, ...safeQuestion }) => safeQuestion) };
}

export async function listAssessmentReviewQueue(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ attempt: assessmentAttempts, assessment: assessments }).from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(and(eq(assessmentAttempts.organizationId, organizationId), eq(assessmentAttempts.reviewStatus, "pending"))).orderBy(desc(assessmentAttempts.submittedAt)).limit(100);
}

export async function reviewAssessmentAttempt(input: { organizationId: number; attemptId: number; reviewerId: number; outcome: "completed" | "rejected"; scorePercent: number; rubric: Record<string, number>; notes?: string; validatedLevel?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await db.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.id, input.attemptId))).limit(1);
  if (!current[0] || current[0].reviewStatus !== "pending") throw new Error("Attempt is not pending review");
  const passed = input.outcome === "completed";
  await db.update(assessmentAttempts).set({ status: "scored", reviewStatus: input.outcome, reviewScore: input.scorePercent, scorePercent: input.scorePercent, passed: passed ? 1 : 0, reviewNotes: input.notes, scoredAt: new Date() }).where(and(eq(assessmentAttempts.organizationId, input.organizationId), eq(assessmentAttempts.id, input.attemptId)));
  await db.insert(assessmentReviews).values({ organizationId: input.organizationId, attemptId: input.attemptId, reviewerId: input.reviewerId, outcome: input.outcome, scorePercent: input.scorePercent, rubricJson: JSON.stringify(input.rubric), notes: input.notes });
  const reviewedAssessment = await db.select().from(assessments).where(and(eq(assessments.organizationId, input.organizationId), eq(assessments.id, current[0].assessmentId))).limit(1);
  if (passed && input.validatedLevel !== undefined && reviewedAssessment[0]?.competencyId) {
    const existingCompetency = await db.select().from(userCompetencies).where(and(eq(userCompetencies.organizationId, input.organizationId), eq(userCompetencies.userId, current[0].userId), eq(userCompetencies.competencyId, reviewedAssessment[0].competencyId))).limit(1);
    if (existingCompetency[0]) await db.update(userCompetencies).set({ currentLevel: Math.max(existingCompetency[0].currentLevel, input.validatedLevel), validatedLevel: Math.max(existingCompetency[0].validatedLevel, input.validatedLevel), evidenceState: "trainer_verified", verifiedAt: new Date() }).where(eq(userCompetencies.id, existingCompetency[0].id));
    else await db.insert(userCompetencies).values({ organizationId: input.organizationId, userId: current[0].userId, competencyId: reviewedAssessment[0].competencyId, currentLevel: input.validatedLevel, validatedLevel: input.validatedLevel, evidenceState: "trainer_verified", verifiedAt: new Date() });
  }
  await recordAudit({ organizationId: input.organizationId, actorUserId: input.reviewerId, action: "assessment.reviewed", targetType: "assessment_attempt", targetId: String(input.attemptId), before: current[0], after: { outcome: input.outcome, scorePercent: input.scorePercent, rubric: input.rubric } });
  return { success: true as const, outcome: input.outcome, scorePercent: input.scorePercent, passed };
}

export async function getEvidenceById(input: { organizationId: number; evidenceId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(evidence).where(and(eq(evidence.organizationId, input.organizationId), eq(evidence.id, input.evidenceId))).limit(1);
  return rows[0];
}
