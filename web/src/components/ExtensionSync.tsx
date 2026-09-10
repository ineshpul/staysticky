"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  fetchNotesFromExtension,
  getSavedExtensionId,
  isExtensionLinked,
  mergeIncomingNote,
} from "@/lib/extension-sync";
import { hostnameOf } from "@/lib/utils";
import { NOTE_COLORS, type Note, type Project } from "@/lib/types";

const POLL_MS = 15000;

function autoGroupNotes(
  notes: Note[],
  existingProjects: Project[],
  enabled: boolean,
): { notes: Note[]; newProjects: Project[] } {
  if (!enabled) return { notes, newProjects: [] };

  const projects = [...existingProjects];
  const byHost = new Map<string, Project>();
  for (const p of projects) {
    byHost.set(p.name.toLowerCase(), p);
  }

  const newProjects: Project[] = [];
  const nextNotes = notes.map((note) => {
    if (note.projectId || note.archived) return note;
    const host = hostnameOf(note.url || note.pageKey);
    if (!host) return note;
    const key = host.toLowerCase();
    let project = byHost.get(key);
    if (!project) {
      project = {
        id: `p_${host.replace(/[^a-z0-9]+/gi, "_").slice(0, 24)}_${Date.now().toString(36)}`,
        name: host,
        color: NOTE_COLORS[projects.length % NOTE_COLORS.length],
        summary: null,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      projects.push(project);
      newProjects.push(project);
      byHost.set(key, project);
    }
    return { ...note, projectId: project.id };
  });

  return { notes: nextNotes, newProjects };
}

/** Keeps extension ↔ Firestore sync running after the first successful link. */
export function ExtensionSync() {
  const { user, profile } = useAuth();
  const { notes, projects, importNotes, upsertProject } = useLibrary();
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
      const res = await fetchNotesFromExtension(extensionId);
      if (cancelled || !res.ok) return;

      const cloudById = new Map(notesRef.current.map((n) => [n.id, n]));
      const merged = res.notes.map((incoming) =>
        mergeIncomingNote(cloudById.get(incoming.id), incoming),
      );

      const grouped = autoGroupNotes(
        merged,
        projectsRef.current,
        profile?.settings.autoGroup !== false,
      );

      for (const p of grouped.newProjects) {
        await upsertProject(p);
      }
      await importNotes(grouped.notes);
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
  }, [user, profile?.settings.syncEnabled, profile?.settings.autoGroup, importNotes, upsertProject]);

  return null;
}
