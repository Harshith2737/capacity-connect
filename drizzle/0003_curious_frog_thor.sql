CREATE TABLE `course_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`position` int NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 30,
	CONSTRAINT `course_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_module_position_idx` UNIQUE(`organizationId`,`courseId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `module_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`moduleId` int NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_progress_idx` UNIQUE(`organizationId`,`enrollmentId`,`moduleId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`organizationId`,`userId`,`createdAt`);