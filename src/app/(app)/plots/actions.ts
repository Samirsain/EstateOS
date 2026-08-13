"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { nextAllotmentCode, nextCustomerCode, nextPlotCode, nextProjectCode } from "@/lib/ids";
import type { ActionState } from "@/lib/types";

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await assertPermission("projects.create");

    const name = String(formData.get("name") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();
    const totalPlotsStr = String(formData.get("total_plots") ?? "0").trim();
    const status = String(formData.get("status") ?? "Active").trim();
    const projectType = String(formData.get("project_type") ?? "Residential").trim();
    const description = String(formData.get("description") ?? "").trim();

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Project name is required.";
    if (!location) errors.location = "Location is required.";

    if (Object.keys(errors).length > 0) {
      return { ok: false, message: "Please resolve form errors.", errors };
    }

    const db = await getDb();
    const code = await nextProjectCode();

    await db.projects.create({
      data: {
        code,
        name,
        location,
        total_plots: Number(totalPlotsStr) || 0,
        status,
        project_type: projectType,
        description: description || null,
        created_by: user.id,
      },
    });

    await recordAudit({
      actor: user,
      action: "project.created",
      entity: "project",
      entityRef: code,
    });

    revalidatePath("/plots");
    return { ok: true, message: `Project ${name} created successfully!`, createdCode: code };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to create project." };
  }
}

export async function createPlotAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await assertPermission("plots.create");

    const projectIdStr = String(formData.get("project_id") ?? "").trim();
    const plotNumber = String(formData.get("plot_number") ?? "").trim();
    const block = String(formData.get("block") ?? "").trim();
    const sizeSqftStr = String(formData.get("size_sqft") ?? "0").trim();
    const ratePerSqftStr = String(formData.get("rate_per_sqft") ?? "0").trim();
    const facing = String(formData.get("facing") ?? "").trim();
    const plotType = String(formData.get("plot_type") ?? "Residential").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const errors: Record<string, string> = {};
    if (!projectIdStr) errors.project_id = "Please select a project.";
    if (!plotNumber) errors.plot_number = "Plot number is required.";
    if (!sizeSqftStr || Number(sizeSqftStr) <= 0) errors.size_sqft = "Valid size in sq.ft is required.";
    if (!ratePerSqftStr || Number(ratePerSqftStr) <= 0) errors.rate_per_sqft = "Valid rate per sq.ft is required.";

    if (Object.keys(errors).length > 0) {
      return { ok: false, message: "Please resolve form errors.", errors };
    }

    const projectId = Number(projectIdStr);
    const sizeSqft = Number(sizeSqftStr);
    const ratePerSqft = Number(ratePerSqftStr);
    const totalPrice = sizeSqft * ratePerSqft;

    const db = await getDb();
    const plotCode = await nextPlotCode();

    await db.plots.create({
      data: {
        plot_code: plotCode,
        project_id: projectId,
        plot_number: plotNumber,
        block: block || null,
        size_sqft: sizeSqft,
        rate_per_sqft: ratePerSqft,
        total_price: totalPrice,
        facing: facing || null,
        plot_type: plotType,
        status: "Available",
        notes: notes || null,
        created_by: user.id,
      },
    });

    // Update project total_plots count
    await db.projects.update({
      where: { id: projectId },
      data: { total_plots: { increment: 1 } },
    });

    await recordAudit({
      actor: user,
      action: "plot.created",
      entity: "plot",
      entityRef: plotCode,
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    return { ok: true, message: `Plot ${plotNumber} (${plotCode}) added successfully!`, createdCode: plotCode };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to create plot." };
  }
}

export async function allotPlotAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await assertPermission("plots.allot");

    const plotIdStr = String(formData.get("plot_id") ?? "").trim();
    // Customer fields (inline registration)
    const customerName = String(formData.get("customer_name") ?? "").trim();
    const customerMobile = String(formData.get("customer_mobile") ?? "").trim();
    const customerType = String(formData.get("customer_type") ?? "User").trim();
    const customerAadhaar = String(formData.get("customer_aadhaar") ?? "").trim();
    const inviteCode = String(formData.get("invite_code") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const errors: Record<string, string> = {};
    if (!plotIdStr) errors.plot_id = "Please select a plot.";
    if (!customerName) errors.customer_name = "Buyer name is required.";
    if (!customerMobile || !/^\d{10}$/.test(customerMobile.replace(/\D/g, "")))
      errors.customer_mobile = "Valid 10-digit mobile number is required.";

    if (Object.keys(errors).length > 0) {
      return { ok: false, message: "Please resolve form errors.", errors };
    }

    const db = await getDb();

    // Verify plot is available or on hold
    const plot = await db.plots.findUnique({
      where: { id: Number(plotIdStr) },
    });
    if (!plot) return { ok: false, message: "Selected plot not found." };
    if (plot.status === "Allotted" || plot.status === "Booked") {
      return { ok: false, message: "This plot is already allotted." };
    }

    // Lookup referring member if invite code provided
    let memberId: number | null = null;
    let inviteCodeVal = inviteCode || "DIRECT";

    if (inviteCode) {
      const member = await db.members.findFirst({
        where: { invite_code: inviteCode, is_active: 1 },
      });
      if (!member) {
        return { ok: false, message: "Member invite code not found or inactive.", errors: { invite_code: "Member not found." } };
      }
      memberId = member.id;
    }

    // Create customer record
    const customerCode = await nextCustomerCode();
    const mobile10 = customerMobile.replace(/\D/g, "").slice(-10);

    const aadhaarDigits = customerAadhaar.replace(/\D/g, "");
    const aadhaarLast4 = aadhaarDigits.slice(-4) || "0000";
    const { encryptField, blindIndex } = await import("@/lib/crypto");
    const aadhaarEncrypted = aadhaarDigits ? encryptField(aadhaarDigits) : "";
    const aadhaarIdx = aadhaarDigits ? blindIndex(aadhaarDigits) : `NO_AADHAAR_${customerCode}_${Date.now()}`;

    // Check for duplicate mobile
    const mobileClash = await db.customers.findUnique({
      where: { mobile: mobile10 },
    });
    if (mobileClash) {
      return {
        ok: false,
        message: `Mobile already registered to customer ${mobileClash.customer_code}.`,
        errors: { customer_mobile: "Already registered." },
      };
    }

    const createdCustomer = await db.customers.create({
      data: {
        customer_code: customerCode,
        name: customerName,
        mobile: mobile10,
        customer_type: customerType,
        aadhaar_encrypted: aadhaarEncrypted,
        aadhaar_index: aadhaarIdx,
        aadhaar_last4: aadhaarLast4,
        member_id: memberId,
        invite_code: inviteCodeVal,
        created_by: user.id,
      },
    });

    const allotmentCode = await nextAllotmentCode();
    const price = Number(plot.total_price) || 0;

    // Insert allotment
    await db.plot_allotments.create({
      data: {
        allotment_code: allotmentCode,
        plot_id: plot.id,
        customer_id: createdCustomer.id,
        member_id: memberId,
        agreed_price: price,
        booking_amount: 0,
        payment_status: "Completed",
        notes: notes || null,
        created_by: user.id,
      },
    });

    // Mark plot as Allotted
    await db.plots.update({
      where: { id: plot.id },
      data: { status: "Allotted" },
    });

    await recordAudit({
      actor: user,
      action: "plot.allotted",
      entity: "plot_allotment",
      entityRef: allotmentCode,
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
    revalidatePath("/members");
    return {
      ok: true,
      message: `Plot ${plot.plot_number} allotted to ${customerName} (${customerCode})!`,
      createdCode: allotmentCode,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to allot plot." };
  }
}

export async function updatePlotStatusAction(
  plotId: number,
  newStatus: "Available" | "Hold",
): Promise<ActionState> {
  try {
    await assertPermission("plots.create");
    const db = await getDb();

    await db.plots.updateMany({
      where: { id: plotId, status: { not: "Allotted" } },
      data: { status: newStatus },
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    return { ok: true, message: `Plot status updated to ${newStatus}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to update status." };
  }
}

export async function deletePlotAction(plotId: number): Promise<ActionState> {
  try {
    const user = await assertPermission("plots.delete");
    const db = await getDb();

    const plot = await db.plots.findUnique({
      where: { id: plotId },
    });
    if (!plot) return { ok: false, message: "Plot not found." };
    if (plot.status === "Allotted" || plot.status === "Booked") {
      return { ok: false, message: "Cannot delete an allotted plot." };
    }

    await db.plot_allotments.deleteMany({ where: { plot_id: plotId } });
    await db.plots.delete({ where: { id: plotId } });

    // Decrement total plots count for project
    await db.projects.update({
      where: { id: plot.project_id },
      data: { total_plots: { decrement: 1 } },
    });

    await recordAudit({
      actor: user,
      action: "plot.deleted",
      entity: "plot",
      entityRef: String(plot.plot_code),
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    return { ok: true, message: `Plot ${plot.plot_number} deleted.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to delete plot." };
  }
}

export async function deleteProjectAction(projectId: number): Promise<ActionState> {
  try {
    const user = await assertPermission("projects.delete");
    const db = await getDb();

    const prj = await db.projects.findUnique({
      where: { id: projectId },
      include: { _count: { select: { plots: true } } },
    });
    if (!prj) return { ok: false, message: "Project not found." };

    if (prj._count.plots > 0) {
      return {
        ok: false,
        message: `Cannot delete project with ${prj._count.plots} plot(s). Delete plots first.`,
      };
    }

    await db.projects.delete({ where: { id: projectId } });

    await recordAudit({
      actor: user,
      action: "project.deleted",
      entity: "project",
      entityRef: String(prj.code),
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    return { ok: true, message: `Project ${prj.name} deleted successfully.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to delete project." };
  }
}
