import { getDb } from "./db";
import type { SessionUser } from "./types";

export interface AuditEntry {
  actor: SessionUser | null;
  action: string;
  entity: string;
  entityRef?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Appends to the audit trail. Every state change in the system routes through
 * here so the MD-facing audit log is a complete record (PRD §6, §9).
 */
export async function recordAudit({
  actor,
  action,
  entity,
  entityRef = null,
  details,
}: AuditEntry): Promise<void> {
  const db = await getDb();
  await db.audit_logs.create({
    data: {
      actor_id: actor?.id ?? null,
      actor_name: actor?.name ?? "system",
      actor_role: actor?.role ?? "SYSTEM",
      action,
      entity,
      entity_ref: entityRef,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

export async function recordDuplicateAttempt(params: {
  field: "mobile" | "aadhaar";
  entity: "customer" | "member";
  maskedValue: string;
  existingCode: string | null;
  attemptedName: string | null;
  actor: SessionUser | null;
}): Promise<void> {
  const db = await getDb();
  await db.duplicate_attempts.create({
    data: {
      field: params.field,
      entity: params.entity,
      masked_value: params.maskedValue,
      existing_code: params.existingCode,
      attempted_name: params.attemptedName,
      attempted_by: params.actor?.id ?? null,
    },
  });
}

