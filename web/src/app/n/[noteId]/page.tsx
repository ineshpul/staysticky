import { NoteDetailPage } from "@/components/NoteDetailPage";

export default async function NoteRoute({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NoteDetailPage noteId={noteId} />;
}
