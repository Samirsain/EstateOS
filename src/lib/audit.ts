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
export function recordAudit({
  actor,
  action,
  entity,
  entityRef = null,
  details,
}: AuditEntry): void {
  getDb()
    .prepare(
      `INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity, entity_ref, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      actor?.id ?? null,
      actor?.name ?? "system",
      actor?.role ?? "SYSTEM",
      action,
      entity,
      entityRef,
      details ? JSON.stringify(details) : null,
    );
}

export function recordDuplicateAttempt(params: {
  field: "mobile" | "aadhaar";
  entity: "customer" | "member";
  maskedValue: string;
  existingCode: string | null;
  attemptedName: string | null;
  actor: SessionUser | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO duplicate_attempts (field, entity, masked_value, existing_code, attempted_name, attempted_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      params.field,
      params.entity,
      params.maskedValue,
      params.existingCode,
      params.attemptedName,
      params.actor?.id ?? null,
    );
}
