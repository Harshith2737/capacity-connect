/**
 * Provider-neutral boundaries. Core competency and assessment logic must keep
 * working when optional providers are not configured.
 */
export type StoredObject = { key: string; contentType: string; sizeBytes: number };
export type Notification = { recipientUserId: number; type: string; subject: string; body: string };

export interface FileGateway {
  createUpload(input: { organizationId: number; ownerUserId: number; fileName: string; contentType: string; sizeBytes: number }): Promise<{ uploadUrl: string; objectKey: string }>;
  inspect(object: StoredObject): Promise<{ safe: boolean; reason?: string }>;
}

export interface NotificationGateway {
  send(notification: Notification): Promise<{ accepted: boolean; providerMessageId?: string }>;
}

export interface AssessmentGateway {
  start(input: { organizationId: number; assessmentId: number; userId: number }): Promise<{ attemptId: number; expiresAt?: Date }>;
  submit(input: { attemptId: number; answers: Record<string, unknown> }): Promise<{ attemptId: number; status: "submitted" | "scored"; scorePercent?: number; passed?: boolean }>;
}

export interface IntelligenceGateway {
  explainRecommendation(input: { gap: string; targetLevel: number; currentLevel: number; courseTitle: string }): Promise<string>;
}

export function integrationStatus() {
  return {
    storage: Boolean(process.env.STORAGE_BUCKET || process.env.BUILT_IN_FORGE_API_URL),
    notifications: Boolean(process.env.EMAIL_API_KEY || process.env.BUILT_IN_FORGE_API_URL),
    ai: Boolean(process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.BUILT_IN_FORGE_API_URL),
    externalAssessmentHosting: Boolean(process.env.ASSESSMENT_GATEWAY_URL),
  };
}
