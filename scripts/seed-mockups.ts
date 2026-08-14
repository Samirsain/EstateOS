import type { projects, members, customers } from "@prisma/client";
import { getDb } from "../src/lib/db";
import { nextCustomerCode, nextMemberCode, nextPlotCode, nextAllotmentCode, nextProjectCode } from "../src/lib/ids";
import { encryptField, blindIndex } from "../src/lib/crypto";

async function main() {
  console.log("Starting 20 Mockup Seed Data Creation...");
  const db = await getDb();

  // Find or create admin user ID
  const mdUser = await db.users.findFirst({ where: { role: "MD" } });
  const userId = mdUser ? mdUser.id : 1;

  // 1. Projects
  const projectDefs = [
    { name: "3% Greenfield Enclave", location: "Ajmer Road, Jaipur", type: "Residential" },
    { name: "3% Apex Commercial Hub", location: "MI Road, Jaipur", type: "Commercial" },
    { name: "3% Eco Agriculture Farms", location: "Tonk Road, Jaipur", type: "Agriculture" },
    { name: "3% Industrial Park West", location: "RIICO Zone, Bhiwadi", type: "Industrial" },
    { name: "3% Harmony Institutional Enclave", location: "Jagatpura, Jaipur", type: "Informal" },
  ];

  const projectMap: Record<string, projects> = {};
  for (const p of projectDefs) {
    let existing = await db.projects.findFirst({ where: { name: p.name } });
    if (!existing) {
      const code = await nextProjectCode(db);
      existing = await db.projects.create({
        data: {
          code,
          name: p.name,
          location: p.location,
          total_plots: 0,
          status: "Active",
          project_type: p.type,
          created_by: userId,
        },
      });
    }
    projectMap[p.type] = existing;
  }

  // 2. Members (Agents)
  const memberDefs = [
    { name: "Vikramaditya Rathore", city: "Jaipur", mobile: "9829011111", company: "Rathore Real Estate" },
    { name: "Sunil Mehta", city: "Jaipur", mobile: "9829022222", company: "Mehta & Sons Associates" },
    { name: "Pooja Khandelwal", city: "Kota", mobile: "9829033333", company: "Khandelwal Realty" },
    { name: "Manish Agarwal", city: "Udaipur", mobile: "9829044444", company: "Agarwal Land Developers" },
  ];

  const memberList: members[] = [];
  for (const m of memberDefs) {
    let existing = await db.members.findUnique({ where: { mobile: m.mobile } });
    if (!existing) {
      const code = await nextMemberCode(db);
      const aadhaar = `55556666${Math.floor(1000 + Math.random() * 9000)}`;
      existing = await db.members.create({
        data: {
          member_code: code,
          name: m.name,
          mobile: m.mobile,
          city: m.city,
          company_name: m.company,
          invite_code: code,
          aadhaar_encrypted: encryptField(aadhaar),
          aadhaar_index: blindIndex(aadhaar),
          aadhaar_last4: aadhaar.slice(-4),
          created_by: userId,
        },
      });
    }
    memberList.push(existing);
  }

  // 3. Customers
  const customerDefs = [
    { name: "Rameshwar Sharma", mobile: "9414011111", type: "Investor" },
    { name: "Kavita Singhania", mobile: "9414022222", type: "User" },
    { name: "Deepak Choudhary", mobile: "9414033333", type: "Investor" },
    { name: "Anjali Verma", mobile: "9414044444", type: "User" },
    { name: "Suresh Saini", mobile: "9414055555", type: "Investor" },
    { name: "Meenakshi Gupta", mobile: "9414066666", type: "User" },
    { name: "Harish Pareek", mobile: "9414077777", type: "Investor" },
    { name: "Divya Maheswari", mobile: "9414088888", type: "User" },
  ];

  const customerList: customers[] = [];
  for (const [idx, c] of customerDefs.entries()) {
    let existing = await db.customers.findUnique({ where: { mobile: c.mobile } });
    if (!existing) {
      const code = await nextCustomerCode(db);
      const aadhaar = `77778888${Math.floor(1000 + Math.random() * 9000)}`;
      const assignedMember = memberList[idx % memberList.length];
      existing = await db.customers.create({
        data: {
          customer_code: code,
          name: c.name,
          mobile: c.mobile,
          customer_type: c.type,
          member_id: assignedMember.id,
          invite_code: assignedMember.invite_code,
          aadhaar_encrypted: encryptField(aadhaar),
          aadhaar_index: blindIndex(aadhaar),
          aadhaar_last4: aadhaar.slice(-4),
          created_by: userId,
        },
      });
    }
    customerList.push(existing);
  }

  // 4. 20 Plots Specification
  const plotSpecs = [
    // Residential
    { num: "R-101", cat: "Residential", size: 1200, price: 1800000, facing: "East", status: "Sold", buyerIdx: 0, agentIdx: 0, refType: "member" },
    { num: "R-102", cat: "Residential", size: 1500, price: 2250000, facing: "Corner Plot", status: "Sold", buyerIdx: 1, agentIdx: 1, refType: "customer" },
    { num: "R-103", cat: "Residential", size: 1800, price: 2700000, facing: "North-East (NE)", status: "Hold", buyerIdx: null, agentIdx: null, refType: "none" },
    { num: "R-104", cat: "Residential", size: 2400, price: 3600000, facing: "3-Side Open", status: "Available", buyerIdx: null, agentIdx: null, refType: "none" },
    
    // Commercial
    { num: "C-201", cat: "Commercial", size: 800, price: 3200000, facing: "North", status: "Sold", buyerIdx: 2, agentIdx: null, refType: "none" }, // Direct 3% Club sale
    { num: "C-202", cat: "Commercial", size: 1000, price: 4000000, facing: "Corner Plot", status: "Sold", buyerIdx: 3, agentIdx: 2, refType: "member" },
    { num: "C-203", cat: "Commercial", size: 1500, price: 6000000, facing: "South", status: "Hold", buyerIdx: null, agentIdx: null, refType: "none" },
    { num: "C-204", cat: "Commercial", size: 2000, price: 8000000, facing: "West", status: "Available", buyerIdx: null, agentIdx: null, refType: "none" },

    // Agriculture
    { num: "AG-301", cat: "Agriculture", size: 43560, price: 4500000, facing: "North-West (NW)", status: "Sold", buyerIdx: 4, agentIdx: 3, refType: "member" },
    { num: "AG-302", cat: "Agriculture", size: 87120, price: 8500000, facing: "3-Side Open", status: "Sold", buyerIdx: 5, agentIdx: 0, refType: "customer" },
    { num: "AG-303", cat: "Agriculture", size: 21780, price: 2500000, facing: "East", status: "Hold", buyerIdx: null, agentIdx: null, refType: "none" },
    { num: "AG-304", cat: "Agriculture", size: 30000, price: 3200000, facing: "South-East (SE)", status: "Available", buyerIdx: null, agentIdx: null, refType: "none" },

    // Industrial
    { num: "IND-401", cat: "Industrial", size: 5000, price: 7500000, facing: "South-West (SW)", status: "Sold", buyerIdx: 6, agentIdx: 1, refType: "member" },
    { num: "IND-402", cat: "Industrial", size: 10000, price: 15000000, facing: "Corner Plot", status: "Sold", buyerIdx: 7, agentIdx: null, refType: "none" }, // Direct sale
    { num: "IND-403", cat: "Industrial", size: 7500, price: 11000000, facing: "North", status: "Hold", buyerIdx: null, agentIdx: null, refType: "none" },
    { num: "IND-404", cat: "Industrial", size: 12000, price: 18000000, facing: "East", status: "Available", buyerIdx: null, agentIdx: null, refType: "none" },

    // Informal
    { num: "INF-501", cat: "Informal", size: 2000, price: 1600000, facing: "North-East (NE)", status: "Sold", buyerIdx: 0, agentIdx: 2, refType: "member" },
    { num: "INF-502", cat: "Informal", size: 3000, price: 2400000, facing: "West", status: "Sold", buyerIdx: 1, agentIdx: 3, refType: "customer" },
    { num: "INF-503", cat: "Informal", size: 2500, price: 2000000, facing: "South", status: "Hold", buyerIdx: null, agentIdx: null, refType: "none" },
    { num: "INF-504", cat: "Informal", size: 4000, price: 3200000, facing: "Corner Plot", status: "Available", buyerIdx: null, agentIdx: null, refType: "none" },
  ];

  let addedCount = 0;
  for (const spec of plotSpecs) {
    const proj = projectMap[spec.cat];
    let plot = await db.plots.findFirst({
      where: { project_id: proj.id, plot_number: spec.num },
    });

    if (!plot) {
      const code = await nextPlotCode(db);
      const rate = Math.round(spec.price / spec.size);
      plot = await db.plots.create({
        data: {
          plot_code: code,
          project_id: proj.id,
          plot_number: spec.num,
          size_sqft: spec.size,
          rate_per_sqft: rate,
          total_price: spec.price,
          facing: spec.facing,
          plot_type: spec.cat,
          status: spec.status,
          created_by: userId,
        },
      });

      // Update project count
      await db.projects.update({
        where: { id: proj.id },
        data: { total_plots: { increment: 1 } },
      });

      // If status is Sold, create allotment record
      if (spec.status === "Sold" && spec.buyerIdx !== null) {
        const buyer = customerList[spec.buyerIdx % customerList.length];
        const agent = spec.agentIdx !== null ? memberList[spec.agentIdx % memberList.length] : null;
        const allotmentCode = await nextAllotmentCode(db);

        await db.plot_allotments.create({
          data: {
            allotment_code: allotmentCode,
            plot_id: plot.id,
            customer_id: buyer.id,
            member_id: agent ? agent.id : null,
            agreed_price: spec.price,
            booking_amount: spec.price,
            payment_status: "Completed",
            notes: spec.refType === "customer" 
              ? `Referred by Customer ${customerList[(spec.buyerIdx + 1) % customerList.length].name}` 
              : spec.refType === "member" 
              ? `Referred by Agent ${agent?.name}` 
              : "Direct 3% Club Sale",
            created_by: userId,
          },
        });
      }
      addedCount++;
    }
  }

  console.log(`Successfully created ${addedCount} mockup plots and allotments!`);
}

main().catch((err) => {
  console.error("Error seeding mockups:", err);
  process.exit(1);
});
