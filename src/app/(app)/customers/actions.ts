"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { requireText } from "@/lib/validation";

/** Permanently removes a customer. Nothing else in the app depends on the row. */
export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("customers.delete");
  const code = requireText(formData.get("customerCode"), { max: 40 });
  const db = await getDb();

  const customerResult = await db.execute({
    sql: "SELECT id, name FROM customers WHERE customer_code = ?",
    args: [code],
  });
  const customer = customerResult.rows[0] as unknown as
    | { id: number; name: string }
    | undefined;
  if (!customer) return;

  await db.execute({
    sql: "DELETE FROM customers WHERE id = ?",
    args: [customer.id],
  });

  await recordAudit({
    actor,
    action: "customer.deleted",
    entity: "customer",
    entityRef: code,
    details: { name: customer.name },
  });

  revalidatePath("/customers");
  redirect("/customers");
}
