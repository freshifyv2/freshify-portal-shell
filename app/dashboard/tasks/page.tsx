import { redirect } from "next/navigation";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { ModuleGuide } from "@/lib/ModuleGuide";

export const dynamic = "force-dynamic";

export default async function TasksGuide() {
  const ctx = await loadChromeContext();
  if (!ctx) redirect("/login");

  return (
    <Chrome
      active="tasks"
      pageTitle="Tasks"
      user={ctx.user}
      activeCompany={ctx.activeCompany}
      tenantOptions={ctx.tenantOptions}
    >
      <ModuleGuide
        moduleName="Tasks"
        tagline="The atomic unit of work — assignable, time-bounded, traceable."
        whyItFits="Once Projects exist, the natural next layer is Tasks: small units of work assigned to a user with a due date, priority, and status. Tasks roll up into Project progress, drive notifications, and feed Reports."
        suggestedEntities={[
          { name: "Task", fields: "id, projectId, workspaceId, title, description, assigneeId, status (open/in-progress/blocked/done), priority, dueDate, completedAt" },
          { name: "TaskComment", fields: "taskId, userId, body, createdAt" },
          { name: "TaskActivity", fields: "taskId, actorId, action (created/assigned/completed/reopened), timestamp" },
        ]}
        suggestedScreens={[
          "My Tasks (assigned to me, grouped by status)",
          "Task List per Project (kanban or list view)",
          "Task Detail (description, activity, comments)",
          "Quick-create Task modal",
          "Bulk reassign / status change for operators",
        ]}
      />
    </Chrome>
  );
}
