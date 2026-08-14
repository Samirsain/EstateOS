"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth";
import { checkBlacklist } from "@/lib/blacklist";
import { recalcRoyaltyStatus } from "@/lib/referrals";
import { getDb } from "@/lib/db";
import { nextAllotmentCode, nextCustomerCode, nextPlotCode, nextProjectCode } from "@/lib/ids";
import type { ActionState } from "@/lib/types";

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await assertPermission("projects.create");

    const name = String(formData.get("name") ?? "").trim().toUpperCase();
    const location = String(formData.get("location") ?? "").trim().toUpperCase();
    const totalPlotsStr = String(formData.get("total_plots") ?? "0").trim();
    const status = String(formData.get("status") ?? "Active").trim();
    const projectType = String(formData.get("project_type") ?? "Township").trim();
    const description = String(formData.get("description") ?? "").trim().toUpperCase();

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
    const plotNumber = String(formData.get("plot_number") ?? "").trim().toUpperCase();
    const block = String(formData.get("block") ?? "").trim().toUpperCase();
    const sizeSqftStr = String(formData.get("size_sqft") ?? "0").trim();
    const totalPriceStr = String(formData.get("total_price") ?? "0").trim();
    const ratePerSqftStr = String(formData.get("rate_per_sqft") ?? "0").trim();
    const facing = String(formData.get("facing") ?? "").trim();
    const plotType = String(formData.get("plot_type") ?? "Residential").trim();
    const notes = String(formData.get("notes") ?? "").trim().toUpperCase();

    const errors: Record<string, string> = {};
    if (!projectIdStr) errors.project_id = "Please select a project.";
    if (!plotNumber) errors.plot_number = "Plot number is required.";
    if (!sizeSqftStr || Number(sizeSqftStr) <= 0) errors.size_sqft = "Valid size in sq.ft is required.";
    if (!totalPriceStr && !ratePerSqftStr) errors.total_price = "Total plot price is required.";

    if (Object.keys(errors).length > 0) {
      return { ok: false, message: "Please resolve form errors.", errors };
    }

    const projectId = Number(projectIdStr);
    const sizeSqft = Number(sizeSqftStr);
    let totalPrice = Number(totalPriceStr) || 0;
    let ratePerSqft = Number(ratePerSqftStr) || 0;

    if (totalPrice > 0 && ratePerSqft === 0 && sizeSqft > 0) {
      ratePerSqft = Math.round(totalPrice / sizeSqft);
    } else if (ratePerSqft > 0 && totalPrice === 0 && sizeSqft > 0) {
      totalPrice = sizeSqft * ratePerSqft;
    }

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
    const existingCustomerIdStr = String(formData.get("existing_customer_id") ?? "").trim();
    const referringMemberIdStr = String(formData.get("referring_member_id") ?? "").trim();
    const referringCustomerIdStr = String(formData.get("referring_customer_id") ?? "").trim();

    // Customer fields (inline registration)
    const customerName = String(formData.get("customer_name") ?? "").trim().toUpperCase();
    const customerMobile = String(formData.get("customer_mobile") ?? "").trim();
    const customerType = String(formData.get("customer_type") ?? "User").trim();
    const customerAadhaar = String(formData.get("customer_aadhaar") ?? "").trim();
    const inviteCode = String(formData.get("invite_code") ?? "").trim().toUpperCase();
    const notes = String(formData.get("notes") ?? "").trim().toUpperCase();

    const errors: Record<string, string> = {};
    if (!plotIdStr) errors.plot_id = "Please select a plot.";

    if (!existingCustomerIdStr) {
      if (!customerName) errors.customer_name = "Buyer name is required.";
      if (!customerMobile || !/^\d{10}$/.test(customerMobile.replace(/\D/g, "")))
        errors.customer_mobile = "Valid 10-digit mobile number is required.";
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, message: "Please resolve form errors.", errors };
    }

    const db = await getDb();

    // Verify plot is available or on hold
    const plot = await db.plots.findUnique({
      where: { id: Number(plotIdStr) },
    });
    if (!plot) return { ok: false, message: "Selected plot not found." };
    if (plot.status === "Allotted" || plot.status === "Booked" || plot.status === "Sold") {
      return { ok: false, message: "This plot is already sold." };
    }

    // Determine referring member (Agent / Customer-to-Customer / Direct)
    let memberId: number | null = null;
    let inviteCodeVal = inviteCode || "3% Club";

    if (referringMemberIdStr) {
      const member = await db.members.findUnique({ where: { id: Number(referringMemberIdStr) } });
      if (member) {
        memberId = member.id;
        inviteCodeVal = member.invite_code;
      }
    } else if (referringCustomerIdStr) {
      const refCustomer = await db.customers.findUnique({ where: { id: Number(referringCustomerIdStr) } });
      if (refCustomer) {
        memberId = refCustomer.member_id || null;
        inviteCodeVal = `CUSTOMER_${refCustomer.customer_code}`;
      }
    } else if (inviteCode) {
      const member = await db.members.findFirst({
        where: { invite_code: inviteCode, is_active: 1 },
      });
      if (member) {
        memberId = member.id;
        inviteCodeVal = member.invite_code;
      }
    }

    let finalCustomerId: number;
    let finalCustomerName: string;
    let finalCustomerCode: string;

    if (existingCustomerIdStr) {
      const existingCustomer = await db.customers.findUnique({
        where: { id: Number(existingCustomerIdStr) },
      });
      if (!existingCustomer) return { ok: false, message: "Selected customer record not found." };

      /* Existing buyers are screened too — otherwise picking a saved customer
         from the dropdown would walk straight past the blacklist. */
      if (existingCustomer.is_blacklisted) {
        return {
          ok: false,
          message: `Allotment blocked: ${existingCustomer.name} (${existingCustomer.customer_code}) is blacklisted.`,
        };
      }
      const existingVerdict = await checkBlacklist({
        mobile: existingCustomer.mobile,
        name: existingCustomer.name,
        ignoreEntity: { type: "CUSTOMER", id: existingCustomer.id },
      });
      if (existingVerdict.blocked) {
        return { ok: false, message: `Allotment blocked. ${existingVerdict.message}` };
      }

      finalCustomerId = existingCustomer.id;
      finalCustomerName = existingCustomer.name;
      finalCustomerCode = existingCustomer.customer_code;
    } else {
      // Create new customer record
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
          message: `Mobile already registered to customer ${mobileClash.customer_code} (${mobileClash.name}). Select 'Existing Customer' to assign plot to them.`,
          errors: { customer_mobile: "Already registered." },
        };
      }

      // Global blacklist verification — mobile, Aadhaar hash and name+city.
      const verdict = await checkBlacklist({
        mobile: mobile10,
        aadhaar: aadhaarDigits,
        name: customerName,
      });
      if (verdict.blocked) {
        return {
          ok: false,
          message: `Allotment blocked. ${verdict.message}`,
          errors:
            verdict.factor === "mobile"
              ? { customer_mobile: "Blacklisted buyer." }
              : { customer_name: "Matches a blacklisted record." },
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

      finalCustomerId = createdCustomer.id;
      finalCustomerName = createdCustomer.name;
      finalCustomerCode = createdCustomer.customer_code;
    }

    const allotmentCode = await nextAllotmentCode();
    const price = Number(plot.total_price) || 0;

    // Insert allotment
    await db.plot_allotments.create({
      data: {
        allotment_code: allotmentCode,
        plot_id: plot.id,
        customer_id: finalCustomerId,
        member_id: memberId,
        agreed_price: price,
        booking_amount: price,
        payment_status: "Completed",
        notes: notes || null,
        created_by: user.id,
      },
    });

    // Mark plot as Sold
    await db.plots.update({
      where: { id: plot.id },
      data: { status: "Sold" },
    });

    // Royalty milestone: 5 distinct customers who have actually purchased.
    await recalcRoyaltyStatus(memberId);

    await recordAudit({
      actor: user,
      action: "plot.sold",
      entity: "plot_allotment",
      entityRef: allotmentCode,
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
    revalidatePath("/members");
    return {
      ok: true,
      message: `Plot ${plot.plot_number} sold to ${finalCustomerName} (${finalCustomerCode}) successfully!`,
      createdCode: allotmentCode,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to process plot sale." };
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
      where: { id: plotId, status: { notIn: ["Allotted", "Booked", "Sold"] } },
      data: { status: newStatus },
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    return { ok: true, message: `Plot status updated to ${newStatus}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to update status." };
  }
}

export async function cancelAllotmentAction(plotId: number): Promise<ActionState> {
  try {
    const user = await assertPermission("plots.delete");
    const db = await getDb();

    const plot = await db.plots.findUnique({
      where: { id: plotId },
      include: { allotment: true },
    });
    if (!plot) return { ok: false, message: "Plot not found." };
    if (!plot.allotment) return { ok: false, message: "No active allotment found for this plot." };

    const affectedMemberId = plot.allotment.member_id;

    // Delete allotment record
    await db.plot_allotments.delete({ where: { plot_id: plotId } });

    // Revert plot status back to Available
    await db.plots.update({
      where: { id: plotId },
      data: { status: "Available" },
    });

    /* Cancelling a sale can drop the member back under the royalty threshold. */
    await recalcRoyaltyStatus(affectedMemberId);

    await recordAudit({
      actor: user,
      action: "allotment.cancelled",
      entity: "plot_allotment",
      entityRef: plot.allotment.allotment_code,
    });

    revalidatePath("/plots");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
    revalidatePath("/members");
    return { ok: true, message: `Sale for plot ${plot.plot_number} cancelled. Plot is now Available.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to cancel sale." };
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
    if (plot.status === "Allotted" || plot.status === "Booked" || plot.status === "Sold") {
      return { ok: false, message: "Cannot delete a sold plot. Cancel the sale first." };
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
