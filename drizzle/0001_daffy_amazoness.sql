CREATE TABLE `assessment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('started','submitted','scored','expired','invalidated') NOT NULL DEFAULT 'started',
	`scorePercent` int,
	`passed` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`scoredAt` timestamp,
	CONSTRAINT `assessment_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`competencyId` int,
	`prompt` text NOT NULL,
	`questionType` enum('mcq','multi_select','true_false','short_answer') NOT NULL,
	`optionsJson` text,
	`answerKeyHash` varchar(255),
	`explanation` text,
	`points` int NOT NULL DEFAULT 1,
	`position` int NOT NULL,
	CONSTRAINT `assessment_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_question_position_idx` UNIQUE(`assessmentId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`courseId` int,
	`competencyId` int,
	`title` varchar(220) NOT NULL,
	`assessmentType` enum('mcq','multi_select','true_false','short_answer','practical_task','rubric') NOT NULL,
	`timeLimitSeconds` int,
	`passMarkPercent` int NOT NULL DEFAULT 70,
	`attemptLimit` int NOT NULL DEFAULT 3,
	`status` enum('draft','review','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` varchar(80),
	`requestId` varchar(120),
	`beforeJson` text,
	`afterJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `competencies_tenant_name_idx` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `course_competencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`courseId` int NOT NULL,
	`competencyId` int NOT NULL,
	`targetLevel` int NOT NULL DEFAULT 1,
	CONSTRAINT `course_competencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_competency_idx` UNIQUE(`organizationId`,`courseId`,`competencyId`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`difficulty` enum('foundation','working','advanced','expert') NOT NULL DEFAULT 'foundation',
	`durationMinutes` int NOT NULL,
	`status` enum('draft','review','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`status` enum('enrolled','in_progress','completed','withdrawn') NOT NULL DEFAULT 'enrolled',
	`progressPercent` int NOT NULL DEFAULT 0,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollment_idx` UNIQUE(`organizationId`,`userId`,`courseId`)
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`competencyId` int NOT NULL,
	`evidenceType` enum('assessment','certificate','qualification','work_experience','project','practical_task','trainer_evaluation','uploaded_artifact') NOT NULL,
	`title` varchar(220) NOT NULL,
	`storageKey` varchar(500),
	`claimedLevel` int NOT NULL,
	`status` enum('submitted','under_review','verified','rejected','expired') NOT NULL DEFAULT 'submitted',
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`verifiedAt` timestamp,
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`evidenceId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`fromStatus` varchar(40) NOT NULL,
	`toStatus` varchar(40) NOT NULL,
	`validatedLevel` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int,
	`role` enum('trainee','trainer','admin') NOT NULL,
	`status` enum('pending','active','suspended') NOT NULL DEFAULT 'active',
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberships_tenant_user_idx` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`mode` enum('imd_government','corporate_lnd','placement_cell','training_academy') NOT NULL DEFAULT 'imd_government',
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `role_competency_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`roleId` int NOT NULL,
	`competencyId` int NOT NULL,
	`targetLevel` int NOT NULL,
	`criticality` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_competency_requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_competency_requirement_idx` UNIQUE(`organizationId`,`roleId`,`competencyId`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`criticality` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_tenant_name_idx` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `user_competencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`competencyId` int NOT NULL,
	`currentLevel` int NOT NULL DEFAULT 0,
	`validatedLevel` int NOT NULL DEFAULT 0,
	`evidenceState` enum('self_declared','assessed','evidence_supported','trainer_verified','admin_verified') NOT NULL DEFAULT 'self_declared',
	`verifiedAt` timestamp,
	`expiresAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_competencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_competency_idx` UNIQUE(`organizationId`,`userId`,`competencyId`)
);
--> statement-breakpoint
CREATE INDEX `assessment_attempt_user_idx` ON `assessment_attempts` (`organizationId`,`userId`,`assessmentId`);--> statement-breakpoint
CREATE INDEX `assessments_status_idx` ON `assessments` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `audit_tenant_idx` ON `audit_logs` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `courses_tenant_status_idx` ON `courses` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `departments_organization_idx` ON `departments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `evidence_user_idx` ON `evidence` (`organizationId`,`userId`,`status`);--> statement-breakpoint
CREATE INDEX `evidence_review_idx` ON `evidence_reviews` (`organizationId`,`evidenceId`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`userId`);