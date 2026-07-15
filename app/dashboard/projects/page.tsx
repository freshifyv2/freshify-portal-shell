import { redirect } from "next/navigation";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { ModuleGuide } from "@/lib/ModuleGuide";

export const dynamic = "force-dynamic";

export default async function ProjectsGuide() {
  const ctx = await loadChromeContext();
  if (!ctx) redirect("/login");

  return (
    <Chrome
      active="projects"
      pageTitle="Projects"
      user={ctx.user}
      activeCompany={ctx.activeCompany}
      tenantOptions={ctx.tenantOptions}
      portalOwnerCompanyId={ctx.portalOwnerCompanyId ?? null}
    >
      <ModuleGuide
        moduleName="Projects"
        tagline="A typical service-business module — initiation, scope, milestones, and delivery."
        whyItFits="Most service companies organize their delivery into Projects. Each Project belongs to a Workspace, has a client (Company), a delivery team (Users), a start/end date, and a budget. Adding this module turns the Portal from a foundation into a delivery system."
        suggestedEntities={[
          { name: "Project", fields: "id, workspaceId, companyId, name, status (draft/active/on-hold/closed), startDate, endDate, budget, owner" },
          { name: "ProjectMember", fields: "projectId, userId, role (lead/contributor/observer), allocation %" },
          { name: "ProjectMilestone", fields: "projectId, name, dueDate, status, owner" },
        ]}
        suggestedScreens={[
          "Project List (filterable by workspace, status, owner)",
          "Project Detail (Overview / Team / Milestones / Files / Activity tabs)",
          "Create / Edit Project wizard",
          "Project Archive / Registry",
          "Per-user 'My Projects' on the dashboard",
        ]}
      />
    </Chrome>
  );
}
