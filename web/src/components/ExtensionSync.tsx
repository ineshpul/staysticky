"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  fetchFromExtension,
  getSavedExtensionId,
  isExtensionLinked,
  mergeIncomingNote,
  mergeIncomingProject,
  pushProjectsToExtension,
} from "@/lib/extension-sync";

const POLL_MS = 15000;

/** Keeps extension ↔ Firestore sync running after the first successful link.
 *  Does not invent projects — notes stay ungrouped until tagged explicitly. */
export function ExtensionSync() {
  const { user, profile } = useAuth();
  const { notes, projects, importNotes, importProjects } = useLibrary();
  const notesRef = useRef(notes);
  const projectsRef = useRef(projects);
  notesRef.current = notes;
  projectsRef.current = projects;

  useEffect(() => {
    if (!user) return;
    if (profile && profile.settings.syncEnabled === false) return;
    if (!isExtensionLinked()) return;

    const extensionId = getSavedExtensionId();
    if (!extensionId) return;

    let cancelled = false;

    async function pull() {
      const res = await fetchFromExtension(extensionId);
      if (cancelled || !res.ok) return;

      const cloudNotes = new Map(notesRef.current.map((n) => [n.id, n]));
      const mergedNotes = res.notes.map((incoming) =>
        mergeIncomingNote(cloudNotes.get(incoming.id), incoming),
      );

      const byId = new Map(projectsRef.current.map((p) => [p.id, p]));
      for (const incoming of res.projects) {
        byId.set(incoming.id, mergeIncomingProject(byId.get(incoming.id), incoming));
      }
      const mergedProjects = [...byId.values()];

      if (mergedProjects.length) {
        await importProjects(mergedProjects);
      }
      // Keep extension project list aligned with the library.
      if (projectsRef.current.length) {
        await pushProjectsToExtension(extensionId, projectsRef.current);
      }

      await importNotes(mergedNotes);
    }

    void pull();
    const interval = window.setInterval(() => void pull(), POLL_MS);
    const onFocus = () => void pull();
    const onVis = () => {
      if (!document.hidden) void pull();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, profile?.settings.syncEnabled, importNotes, importProjects]);

  return null;
}
