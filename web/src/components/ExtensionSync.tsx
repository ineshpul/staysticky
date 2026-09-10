"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  deleteProjectInExtension,
  fetchFromExtension,
  getSavedExtensionId,
  isExtensionLinked,
  mergeIncomingNote,
  mergeIncomingProject,
  pushProjectsToExtension,
} from "@/lib/extension-sync";

const POLL_MS = 15000;

function referencedProjectIds(notes: { projectId: string | null }[]): Set<string> {
  return new Set(
    notes.map((n) => n.projectId).filter((id): id is string => Boolean(id)),
  );
}

/** Keeps extension ↔ Firestore sync running after the first successful link.
 *  Only syncs projects that notes actually reference — never invents empty ones. */
export function ExtensionSync() {
  const { user, profile } = useAuth();
  const { notes, projects, importNotes, importProjects, pruneEmptyProjects } = useLibrary();
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

      const referenced = referencedProjectIds([
        ...mergedNotes,
        ...notesRef.current,
      ]);

      const byId = new Map(
        projectsRef.current
          .filter((p) => referenced.has(p.id))
          .map((p) => [p.id, p]),
      );
      for (const incoming of res.projects) {
        if (!referenced.has(incoming.id)) continue;
        byId.set(incoming.id, mergeIncomingProject(byId.get(incoming.id), incoming));
      }
      const mergedProjects = [...byId.values()];

      if (mergedProjects.length) {
        await importProjects(mergedProjects);
      }

      // Drop orphan projects that still live only in the extension.
      for (const orphan of res.projects) {
        if (!referenced.has(orphan.id)) {
          await deleteProjectInExtension(extensionId, orphan.id);
        }
      }

      const toPush = projectsRef.current.filter((p) => referenced.has(p.id));
      if (toPush.length) {
        await pushProjectsToExtension(extensionId, toPush);
      }

      await importNotes(mergedNotes);
      if (!cancelled) {
        const keep =
          typeof window !== "undefined" && window.location.pathname.startsWith("/p/")
            ? window.location.pathname.split("/")[2] || null
            : null;
        await pruneEmptyProjects(keep);
      }
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
  }, [user, profile?.settings.syncEnabled, importNotes, importProjects, pruneEmptyProjects]);

  return null;
}

/** Removes empty leftover projects (auto-created hostnames, unused demos, etc.). */
export function EmptyProjectPruner() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { usingDemo, notes, projects, pruneEmptyProjects } = useLibrary();
  const pruning = useRef(false);

  useEffect(() => {
    if (!user || usingDemo) return;
    if (pruning.current) return;

    const keep =
      pathname.startsWith("/p/") ? pathname.split("/")[2] || null : null;

    const hasEmpties = projects.some(
      (p) =>
        p.id !== keep &&
        !notes.some((n) => n.projectId === p.id && !n.archived),
    );
    if (!hasEmpties) return;

    const timer = window.setTimeout(() => {
      pruning.current = true;
      void pruneEmptyProjects(keep).finally(() => {
        pruning.current = false;
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [user, usingDemo, notes, projects, pathname, pruneEmptyProjects]);

  return null;
}
