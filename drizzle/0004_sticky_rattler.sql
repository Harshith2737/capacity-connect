CREATE TABLE `trainer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`qualifications` text,
	`expertiseJson` text,
	`domainExperience` int NOT NULL DEFAULT 0,
	`assessmentQuality` int NOT NULL DEFAULT 0,
	`deliveryQuality` int NOT NULL DEFAULT 0,
	`availability` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainer_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `trainer_profile_idx` UNIQUE(`organizationId`,`userId`)
);
