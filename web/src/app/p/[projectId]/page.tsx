import { ProjectWorkspace } from "@/components/ProjectWorkspace";

export default async function ProjectRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWorkspace projectId={projectId} />;
}
