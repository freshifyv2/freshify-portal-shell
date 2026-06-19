import { redirect } from "next/navigation";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { ModuleGuide } from "@/lib/ModuleGuide";

export const dynamic = "force-dynamic";

export default async function ReportsGuide() {
  const ctx = await loadChromeContext();
  if (!ctx) redirect("/login");

  return (
    <Chrome
      active="reports"
      pageTitle="Reports"
      user={ctx.user}
      activeCompany={ctx.activeCompany}
      tenantOptions={ctx.tenantOptions}
    >
      <ModuleGuide
        moduleName="Reports"
        tagline="Saved, shareable, scheduled — turn operational data into decisions."
        whyItFits="Service companies need a way to surface what's happening: utilization, on-time delivery, revenue per Workspace, top customers. Reports is a thin module that owns saved queries, scheduling, and shareable views — and reads from every other module."
        suggestedEntities={[
          { name: "Report", fields: "id, name, ownerId, scope (companyId/workspaceId/all), kind (table/chart/kpi), query (JSON), schedule (cron or null)" },
          { name: "ReportShare", fields: "reportId, userId, role (viewer/editor)" },
          { name: "ReportSnapshot", fields: "reportId, takenAt, data (JSON), takenByUserId" },
        ]}
        suggestedScreens={[
          "Report Library (cards by recent / shared / scheduled)",
          "Report Detail (current values + last snapshot)",
          "Report Builder (pick scope, pick metric, pick visualization)",
          "Scheduled Reports (cron + recipient list)",
          "Export to PDF / CSV / Slack",
        ]}
      />
    </Chrome>
  );
}
