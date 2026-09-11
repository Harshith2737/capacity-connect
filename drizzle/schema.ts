import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  mode: mysqlEnum("mode", ["imd_government", "corporate_lnd", "placement_cell", "training_academy"]).default("imd_government").notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  sourceLabel: varchar("sourceLabel", { length: 180 }),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ organizationIdx: index("departments_organization_idx").on(table.organizationId) }));

export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  departmentId: int("departmentId"),
  role: mysqlEnum("role", ["trainee", "trainer", "admin"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended"]).default("active").notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ tenantUserIdx: uniqueIndex("memberships_tenant_user_idx").on(table.organizationId, table.userId), userIdx: index("memberships_user_idx").on(table.userId) }));

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  criticality: int("criticality").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ tenantNameIdx: uniqueIndex("roles_tenant_name_idx").on(table.organizationId, table.name) }));

export const competencies = mysqlTable("competencies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  sourceLabel: varchar("sourceLabel", { length: 180 }),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ tenantNameIdx: uniqueIndex("competencies_tenant_name_idx").on(table.organizationId, table.name) }));

export const roleCompetencyRequirements = mysqlTable("role_competency_requirements", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  roleId: int("roleId").notNull(),
  competencyId: int("competencyId").notNull(),
  targetLevel: int("targetLevel").notNull(),
  criticality: int("criticality").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ requirementIdx: uniqueIndex("role_competency_requirement_idx").on(table.organizationId, table.roleId, table.competencyId) }));

export const userCompetencies = mysqlTable("user_competencies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  competencyId: int("competencyId").notNull(),
  currentLevel: int("currentLevel").default(0).notNull(),
  validatedLevel: int("validatedLevel").default(0).notNull(),
  evidenceState: mysqlEnum("evidenceState", ["self_declared", "assessed", "evidence_supported", "trainer_verified", "admin_verified"]).default("self_declared").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  expiresAt: timestamp("expiresAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userCompetencyIdx: uniqueIndex("user_competency_idx").on(table.organizationId, table.userId, table.competencyId) }));

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  difficulty: mysqlEnum("difficulty", ["foundation", "working", "advanced", "expert"]).default("foundation").notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  status: mysqlEnum("status", ["draft", "review", "published", "archived"]).default("draft").notNull(),
  version: int("version").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ tenantStatusIdx: index("courses_tenant_status_idx").on(table.organizationId, table.status) }));

export const courseCompetencies = mysqlTable("course_competencies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  courseId: int("courseId").notNull(),
  competencyId: int("competencyId").notNull(),
  targetLevel: int("targetLevel").default(1).notNull(),
}, (table) => ({ courseCompetencyIdx: uniqueIndex("course_competency_idx").on(table.organizationId, table.courseId, table.competencyId) }));

export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  status: mysqlEnum("status", ["enrolled", "in_progress", "completed", "withdrawn"]).default("enrolled").notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({ enrollmentIdx: uniqueIndex("enrollment_idx").on(table.organizationId, table.userId, table.courseId) }));

export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  courseId: int("courseId"),
  competencyId: int("competencyId"),
  title: varchar("title", { length: 220 }).notNull(),
  assessmentType: mysqlEnum("assessmentType", ["mcq", "multi_select", "true_false", "short_answer", "practical_task", "rubric"]).notNull(),
  timeLimitSeconds: int("timeLimitSeconds"),
  passMarkPercent: int("passMarkPercent").default(70).notNull(),
  attemptLimit: int("attemptLimit").default(3).notNull(),
  rubricJson: text("rubricJson"),
  status: mysqlEnum("status", ["draft", "review", "published", "archived"]).default("draft").notNull(),
  version: int("version").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ assessmentStatusIdx: index("assessments_status_idx").on(table.organizationId, table.status) }));

export const assessmentQuestions = mysqlTable("assessment_questions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  assessmentId: int("assessmentId").notNull(),
  competencyId: int("competencyId"),
  prompt: text("prompt").notNull(),
  questionType: mysqlEnum("questionType", ["mcq", "multi_select", "true_false", "short_answer"]).notNull(),
  optionsJson: text("optionsJson"),
  answerKeyHash: varchar("answerKeyHash", { length: 255 }),
  explanation: text("explanation"),
  points: int("points").default(1).notNull(),
  position: int("position").notNull(),
}, (table) => ({ assessmentPositionIdx: uniqueIndex("assessment_question_position_idx").on(table.assessmentId, table.position) }));

export const assessmentAttempts = mysqlTable("assessment_attempts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  assessmentId: int("assessmentId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["started", "submitted", "scored", "expired", "invalidated"]).default("started").notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["not_required", "pending", "completed", "rejected"]).default("not_required").notNull(),
  answersJson: text("answersJson"),
  scorePercent: int("scorePercent"),
  reviewScore: int("reviewScore"),
  reviewNotes: text("reviewNotes"),
  passed: int("passed"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  submittedAt: timestamp("submittedAt"),
  scoredAt: timestamp("scoredAt"),
}, (table) => ({ attemptUserIdx: index("assessment_attempt_user_idx").on(table.organizationId, table.userId, table.assessmentId), reviewQueueIdx: index("assessment_attempt_review_idx").on(table.organizationId, table.reviewStatus) }));

export const assessmentReviews = mysqlTable("assessment_reviews", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  attemptId: int("attemptId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  outcome: mysqlEnum("outcome", ["completed", "rejected"]).notNull(),
  scorePercent: int("scorePercent").notNull(),
  rubricJson: text("rubricJson"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ attemptReviewIdx: index("assessment_reviews_attempt_idx").on(table.organizationId, table.attemptId) }));

export const evidence = mysqlTable("evidence", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  competencyId: int("competencyId").notNull(),
  evidenceType: mysqlEnum("evidenceType", ["assessment", "certificate", "qualification", "work_experience", "project", "practical_task", "trainer_evaluation", "uploaded_artifact"]).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }),
  mimeType: varchar("mimeType", { length: 120 }),
  sizeBytes: int("sizeBytes"),
  sha256: varchar("sha256", { length: 64 }),
  scanStatus: mysqlEnum("scanStatus", ["pending", "scanning", "clean", "quarantined", "failed"]).default("pending").notNull(),
  scanProvider: varchar("scanProvider", { length: 120 }),
  scanMessage: text("scanMessage"),
  scannedAt: timestamp("scannedAt"),
  claimedLevel: int("claimedLevel").notNull(),
  status: mysqlEnum("status", ["submitted", "under_review", "verified", "rejected", "expired"]).default("submitted").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  verifiedAt: timestamp("verifiedAt"),
}, (table) => ({ evidenceUserIdx: index("evidence_user_idx").on(table.organizationId, table.userId, table.status), evidenceScanIdx: index("evidence_scan_idx").on(table.organizationId, table.scanStatus) }));

export const evidenceReviews = mysqlTable("evidence_reviews", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  evidenceId: int("evidenceId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  fromStatus: varchar("fromStatus", { length: 40 }).notNull(),
  toStatus: varchar("toStatus", { length: 40 }).notNull(),
  validatedLevel: int("validatedLevel"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ evidenceReviewIdx: index("evidence_review_idx").on(table.organizationId, table.evidenceId) }));

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: varchar("targetId", { length: 80 }),
  requestId: varchar("requestId", { length: 120 }),
  beforeJson: text("beforeJson"),
  afterJson: text("afterJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ auditTenantIdx: index("audit_tenant_idx").on(table.organizationId, table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type AssessmentReview = typeof assessmentReviews.$inferSelect;
