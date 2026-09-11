CREATE TABLE `assessment_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`attemptId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`outcome` enum('completed','rejected') NOT NULL,
	`scorePercent` int NOT NULL,
	`rubricJson` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `reviewStatus` enum('not_required','pending','completed','rejected') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `answersJson` text;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `reviewScore` int;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `reviewNotes` text;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `rubricJson` text;--> statement-breakpoint
ALTER TABLE `competencies` ADD `sourceLabel` varchar(180);--> statement-breakpoint
ALTER TABLE `competencies` ADD `sourceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `departments` ADD `sourceLabel` varchar(180);--> statement-breakpoint
ALTER TABLE `departments` ADD `sourceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `evidence` ADD `mimeType` varchar(120);--> statement-breakpoint
ALTER TABLE `evidence` ADD `sizeBytes` int;--> statement-breakpoint
ALTER TABLE `evidence` ADD `sha256` varchar(64);--> statement-breakpoint
ALTER TABLE `evidence` ADD `scanStatus` enum('pending','scanning','clean','quarantined','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence` ADD `scanProvider` varchar(120);--> statement-breakpoint
ALTER TABLE `evidence` ADD `scanMessage` text;--> statement-breakpoint
ALTER TABLE `evidence` ADD `scannedAt` timestamp;--> statement-breakpoint
CREATE INDEX `assessment_reviews_attempt_idx` ON `assessment_reviews` (`organizationId`,`attemptId`);--> statement-breakpoint
CREATE INDEX `assessment_attempt_review_idx` ON `assessment_attempts` (`organizationId`,`reviewStatus`);--> statement-breakpoint
CREATE INDEX `evidence_scan_idx` ON `evidence` (`organizationId`,`scanStatus`);