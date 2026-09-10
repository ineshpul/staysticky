"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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

const POLL_MS = 12000;

function referencedProjectIds(notes: { projectId: string | null }[]): Set<string> {
  return new Set(
    notes.map((n) => n.projectId).filter((id): id is string => Boolean(id)),
  );
}

/** Keeps extension ↔ Firestore sync running after the first successful link.
 *  Projects that notes reference are imported; empty leftovers are pruned later. */
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

      // Notes must land first so project refs exist before anything prunes.
      await importNotes(mergedNotes);
      if (cancelled) return;

      const referenced = referencedProjectIds(mergedNotes);

      const byId = new Map<string, (typeof res.projects)[number]>();
      for (const cloud of projectsRef.current) {
        if (referenced.has(cloud.id)) byId.set(cloud.id, cloud);
      }
      for (const incoming of res.projects) {
        if (!referenced.has(incoming.id)) continue;
        byId.set(
          incoming.id,
          mergeIncomingProject(byId.get(incoming.id), incoming),
        );
      }

      // Also keep extension projects that notes just pointed at, even if the
      // project map was briefly missing (create-then-tag race).
      for (const note of mergedNotes) {
        if (!note.projectId || byId.has(note.projectId)) continue;
        const fromExt = res.projects.find((p) => p.id === note.projectId);
        if (fromExt) {
          byId.set(fromExt.id, fromExt);
        }
      }

      const mergedProjects = [...byId.values()];
      if (mergedProjects.length) {
        await importProjects(mergedProjects);
      }

      // Push web/cloud project metadata back, but never wipe extension-only
      // projects that are still referenced by local notes.
      const toPush = [
        ...projectsRef.current.filter((p) => referenced.has(p.id)),
        ...mergedProjects,
      ];
      const pushMap = new Map(toPush.map((p) => [p.id, p]));
      if (pushMap.size) {
        await pushProjectsToExtension(extensionId, [...pushMap.values()]);
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
  }, [user, profile?.settings.syncEnabled, importNotes, importProjects]);

  return null;
}

/** Removes empty leftover projects after notes have had time to sync in. */
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

    const graceMs = 120_000;
    const now = Date.now();
    const hasStaleEmpties = projects.some((p) => {
      if (p.id === keep) return false;
      if (notes.some((n) => n.projectId === p.id && !n.archived)) return false;
      const age = now - Math.max(Number(p.createdAt) || 0, Number(p.updatedAt) || 0);
      return age > graceMs;
    });
    if (!hasStaleEmpties) return;

    const timer = window.setTimeout(() => {
      pruning.current = true;
      void pruneEmptyProjects(keep, { graceMs }).finally(() => {
        pruning.current = false;
      });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [user, usingDemo, notes, projects, pathname, pruneEmptyProjects]);

  return null;
}
