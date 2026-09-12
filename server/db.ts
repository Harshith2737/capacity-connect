import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, assessments, assessmentAttempts, assessmentQuestions, assessmentReviews, auditLogs, evidence, evidenceReviews, memberships, users, userCompetencies, competencies, organizations, courses, enrollments, courseModules, moduleProgress, notifications, trainerProfiles, departments, roles, roleCompetencyRequirements } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { rankTrainerCandidates } from "../shared/trainerMatching";

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
  if (!db) throw new Error("Database unavailable: DATABASE_URL is not configured or the connection failed");
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
  if (!db) throw new Error("Database unavailable");
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

export async function getCompetencyById(input: { organizationId: number; competencyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(competencies).where(and(eq(competencies.organizationId, input.organizationId), eq(competencies.id, input.competencyId))).limit(1);
  return rows[0];
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
  await createNotification({ organizationId: input.organizationId, userId: input.userId, type: requiresReview ? "assessment_review_required" : passed ? "assessment_passed" : "assessment_failed", title: requiresReview ? "Assessment submitted for review" : passed ? "Assessment passed" : "Assessment needs another attempt", body: requiresReview ? "Your practical submission is waiting for trainer review." : `Your server-scored assessment result is ${scorePercent}%.` });
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
  await createNotification({ organizationId: input.organizationId, userId: current[0].userId, type: nextStatus === "verified" ? "evidence_verified" : nextStatus === "rejected" ? "evidence_rejected" : "evidence_under_review", title: nextStatus === "verified" ? "Evidence verified" : nextStatus === "rejected" ? "Evidence needs attention" : "Evidence is under review", body: nextStatus === "verified" ? "Your evidence was verified and your competency record was refreshed." : nextStatus === "rejected" ? "Your evidence was not verified. Review the trainer notes and resubmit." : "A trainer has started reviewing your evidence." });
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
  if (!db) throw new Error("Database unavailable");
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
  if (!db) throw new Error("Database unavailable");
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
  await createNotification({ organizationId: input.organizationId, userId: current[0].userId, type: input.outcome === "completed" ? "assessment_passed" : "assessment_rejected", title: input.outcome === "completed" ? "Practical assessment approved" : "Practical assessment needs revision", body: input.notes ?? "Your practical assessment review has been completed." });
  return { success: true as const, outcome: input.outcome, scorePercent: input.scorePercent, passed };
}

export async function getEvidenceById(input: { organizationId: number; evidenceId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(evidence).where(and(eq(evidence.organizationId, input.organizationId), eq(evidence.id, input.evidenceId))).limit(1);
  return rows[0];
}

export async function listCourses(input: { organizationId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ course: courses, enrollment: enrollments }).from(courses)
    .leftJoin(enrollments, and(eq(enrollments.courseId, courses.id), eq(enrollments.userId, input.userId), eq(enrollments.organizationId, input.organizationId)))
    .where(and(eq(courses.organizationId, input.organizationId), eq(courses.status, "published"))).limit(100);
}

export async function getCourse(input: { organizationId: number; userId: number; courseId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const course = await db.select().from(courses).where(and(eq(courses.organizationId, input.organizationId), eq(courses.id, input.courseId), eq(courses.status, "published"))).limit(1);
  if (!course[0]) return undefined;
  const modules = await db.select().from(courseModules).where(and(eq(courseModules.organizationId, input.organizationId), eq(courseModules.courseId, input.courseId))).orderBy(courseModules.position).limit(100);
  const enrollment = await db.select().from(enrollments).where(and(eq(enrollments.organizationId, input.organizationId), eq(enrollments.courseId, input.courseId), eq(enrollments.userId, input.userId))).limit(1);
  const progress = enrollment[0] ? await db.select().from(moduleProgress).where(and(eq(moduleProgress.organizationId, input.organizationId), eq(moduleProgress.enrollmentId, enrollment[0].id))).limit(100) : [];
  return { course: course[0], modules, enrollment: enrollment[0], progress };
}

export async function enrollInCourse(input: { organizationId: number; userId: number; courseId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const course = await db.select().from(courses).where(and(eq(courses.organizationId, input.organizationId), eq(courses.id, input.courseId), eq(courses.status, "published"))).limit(1);
  if (!course[0]) throw new Error("Published course not found in organization");
  const existing = await db.select().from(enrollments).where(and(eq(enrollments.organizationId, input.organizationId), eq(enrollments.userId, input.userId), eq(enrollments.courseId, input.courseId))).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(enrollments).values({ organizationId: input.organizationId, userId: input.userId, courseId: input.courseId, status: "enrolled", progressPercent: 0 });
  const created = await db.select().from(enrollments).where(and(eq(enrollments.organizationId, input.organizationId), eq(enrollments.userId, input.userId), eq(enrollments.courseId, input.courseId))).limit(1);
  if (created[0]) {
    const modules = await db.select().from(courseModules).where(and(eq(courseModules.organizationId, input.organizationId), eq(courseModules.courseId, input.courseId))).limit(100);
    if (modules.length) await db.insert(moduleProgress).values(modules.map((module) => ({ organizationId: input.organizationId, enrollmentId: created[0].id, moduleId: module.id, status: "not_started" as const })));
    await createNotification({ organizationId: input.organizationId, userId: input.userId, type: "course_enrolled", title: "Course added to your learning path", body: `${course[0].title} is now in progress.` });
    await recordAudit({ organizationId: input.organizationId, actorUserId: input.userId, action: "course.enrolled", targetType: "course", targetId: String(input.courseId) });
  }
  return created[0];
}

export async function updateModuleProgress(input: { organizationId: number; userId: number; enrollmentId: number; moduleId: number; completed: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const enrollment = await db.select().from(enrollments).where(and(eq(enrollments.organizationId, input.organizationId), eq(enrollments.id, input.enrollmentId), eq(enrollments.userId, input.userId))).limit(1);
  if (!enrollment[0]) throw new Error("Enrollment not found");
  await db.update(moduleProgress).set({ status: input.completed ? "completed" : "in_progress", completedAt: input.completed ? new Date() : null }).where(and(eq(moduleProgress.organizationId, input.organizationId), eq(moduleProgress.enrollmentId, input.enrollmentId), eq(moduleProgress.moduleId, input.moduleId)));
  const all = await db.select().from(moduleProgress).where(and(eq(moduleProgress.organizationId, input.organizationId), eq(moduleProgress.enrollmentId, input.enrollmentId))).limit(100);
  const completed = all.filter((item) => item.status === "completed").length;
  const progressPercent = all.length ? Math.round((completed / all.length) * 100) : 0;
  await db.update(enrollments).set({ status: progressPercent >= 100 ? "completed" : "in_progress", progressPercent, completedAt: progressPercent >= 100 ? new Date() : null }).where(eq(enrollments.id, input.enrollmentId));
  return { progressPercent, status: progressPercent >= 100 ? "completed" as const : "in_progress" as const };
}

export async function completeCourse(input: { organizationId: number; userId: number; enrollmentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const enrollment = await db.select().from(enrollments).where(and(eq(enrollments.organizationId, input.organizationId), eq(enrollments.id, input.enrollmentId), eq(enrollments.userId, input.userId))).limit(1);
  if (!enrollment[0] || enrollment[0].progressPercent < 100) throw new Error("Complete all course modules before completing the course");
  if (enrollment[0].status !== "completed") await db.update(enrollments).set({ status: "completed", completedAt: new Date() }).where(eq(enrollments.id, input.enrollmentId));
  return { ...enrollment[0], status: "completed" as const, completedAt: enrollment[0].completedAt ?? new Date() };
}

export async function createNotification(input: { organizationId: number; userId: number; type: string; title: string; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(notifications).values(input);
  return db.select().from(notifications).where(and(eq(notifications.organizationId, input.organizationId), eq(notifications.userId, input.userId))).orderBy(desc(notifications.id)).limit(1);
}

export async function listNotifications(input: { organizationId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(notifications).where(and(eq(notifications.organizationId, input.organizationId), eq(notifications.userId, input.userId))).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function getOrganizationAnalytics(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [members, competenciesRows, userRecords, evidenceRows, attempts, courseRows, enrollmentRows] = await Promise.all([
    db.select().from(memberships).where(and(eq(memberships.organizationId, organizationId), eq(memberships.status, "active"))).limit(1000),
    db.select().from(competencies).where(eq(competencies.organizationId, organizationId)).limit(500),
    db.select().from(userCompetencies).where(eq(userCompetencies.organizationId, organizationId)).limit(2000),
    db.select().from(evidence).where(eq(evidence.organizationId, organizationId)).limit(2000),
    db.select().from(assessmentAttempts).where(eq(assessmentAttempts.organizationId, organizationId)).limit(2000),
    db.select().from(courses).where(eq(courses.organizationId, organizationId)).limit(500),
    db.select().from(enrollments).where(eq(enrollments.organizationId, organizationId)).limit(2000),
  ]);
  const averageLevel = userRecords.length ? Math.round((userRecords.reduce((sum, item) => sum + item.validatedLevel, 0) / userRecords.length) * 10) / 10 : null;
  const scoredAttempts = attempts.filter((item) => item.passed !== null);
  const coverage = competenciesRows.map((competency) => { const records = userRecords.filter((record) => record.competencyId === competency.id); const average = records.length ? Math.round((records.reduce((sum, record) => sum + record.validatedLevel, 0) / records.length) * 10) / 10 : null; return { id: competency.id, name: competency.name, peopleTracked: records.length, averageLevel: average, averageGap: average === null ? null : Math.max(0, 3 - average), coveragePercent: average === null ? null : Math.round((average / 3) * 100) }; });
  return { members: members.length, trainees: members.filter((item) => item.role === "trainee").length, trainers: members.filter((item) => item.role === "trainer").length, competenciesTracked: competenciesRows.length, averageLevel, criticalGapCount: userRecords.filter((item) => item.validatedLevel === 0).length, evidencePending: evidenceRows.filter((item) => item.status === "submitted" || item.status === "under_review").length, evidenceVerificationRate: evidenceRows.length ? Math.round((evidenceRows.filter((item) => item.status === "verified").length / evidenceRows.length) * 100) : null, assessmentPassRate: scoredAttempts.length ? Math.round((scoredAttempts.filter((item) => item.passed === 1).length / scoredAttempts.length) * 100) : null, courseCount: courseRows.length, courseCompletionRate: enrollmentRows.length ? Math.round((enrollmentRows.filter((item) => item.status === "completed").length / enrollmentRows.length) * 100) : null, coverage };
}

export async function upsertTrainerProfile(input: { organizationId: number; userId: number; qualifications?: string; expertise: string[]; domainExperience: number; assessmentQuality: number; deliveryQuality: number; availability: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(trainerProfiles).where(and(eq(trainerProfiles.organizationId, input.organizationId), eq(trainerProfiles.userId, input.userId))).limit(1);
  const values = { organizationId: input.organizationId, userId: input.userId, qualifications: input.qualifications, expertiseJson: JSON.stringify(input.expertise), domainExperience: input.domainExperience, assessmentQuality: input.assessmentQuality, deliveryQuality: input.deliveryQuality, availability: input.availability };
  if (existing[0]) await db.update(trainerProfiles).set(values).where(eq(trainerProfiles.id, existing[0].id)); else await db.insert(trainerProfiles).values(values);
  await recordAudit({ organizationId: input.organizationId, actorUserId: input.userId, action: "trainer.profile_updated", targetType: "trainer_profile", targetId: String(input.userId), after: values });
  return db.select().from(trainerProfiles).where(and(eq(trainerProfiles.organizationId, input.organizationId), eq(trainerProfiles.userId, input.userId))).limit(1);
}

export async function matchTrainers(input: { organizationId: number; competencyId: number; requiredLevel: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ profile: trainerProfiles, user: users }).from(trainerProfiles).innerJoin(users, eq(trainerProfiles.userId, users.id)).innerJoin(memberships, eq(trainerProfiles.userId, memberships.userId)).where(and(eq(trainerProfiles.organizationId, input.organizationId), eq(memberships.organizationId, input.organizationId), eq(memberships.role, "trainer"), eq(memberships.status, "active"))).limit(200);
  const records = await db.select().from(userCompetencies).where(and(eq(userCompetencies.organizationId, input.organizationId), eq(userCompetencies.competencyId, input.competencyId))).limit(500);
  return rankTrainerCandidates(rows.map(({ profile, user }) => { const record = records.find((item) => item.userId === profile.userId); const recency = profile.updatedAt && Date.now() - profile.updatedAt.getTime() < 90 * 86_400_000 ? 100 : 50; return { id: user.id, name: user.name ?? user.email ?? `Trainer ${user.id}`, competencyLevel: record?.validatedLevel ?? 0, requiredLevel: input.requiredLevel, domainExperience: profile.domainExperience, assessmentQuality: profile.assessmentQuality, deliveryQuality: profile.deliveryQuality, availability: profile.availability, recency }; }));
}
