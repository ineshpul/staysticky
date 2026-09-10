"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "./auth";
import { getDb } from "./firebase";
import { DEMO_NOTES, DEMO_PROJECTS } from "./demo-data";
import {
  getSavedExtensionId,
  isExtensionLinked,
  pushNotesToExtension,
} from "./extension-sync";
import { buildExtractiveSummary } from "./summary";
import { NOTE_COLORS, type Note, type Project } from "./types";

type LibraryContextValue = {
  notes: Note[];
  projects: Project[];
  usingDemo: boolean;
  lastSyncedAt: number | null;
  upsertNote: (note: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  upsertProject: (project: Project) => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  assignNoteToProject: (noteId: string, projectId: string | null) => Promise<void>;
  refreshProjectSummary: (projectId: string) => Promise<void>;
  importNotes: (notes: Note[]) => Promise<void>;
};

async function mirrorNotesToExtension(notesToPush: Note[]) {
  if (typeof window === "undefined" || !isExtensionLinked()) return;
  const extensionId = getSavedExtensionId();
  if (!extensionId || !notesToPush.length) return;
  await pushNotesToExtension(extensionId, notesToPush);
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>(DEMO_NOTES);
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [usingDemo, setUsingDemo] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setNotes(DEMO_NOTES);
      setProjects(DEMO_PROJECTS);
      setUsingDemo(true);
      setLastSyncedAt(null);
      return;
    }

    setUsingDemo(false);
    const db = getDb();
    const unsubNotes = onSnapshot(collection(db, "users", user.uid, "notes"), (snap) => {
      const next = snap.docs.map((d) => d.data() as Note);
      setNotes(next);
      setLastSyncedAt(Date.now());
    });
    const unsubProjects = onSnapshot(
      collection(db, "users", user.uid, "projects"),
      (snap) => {
        const next = snap.docs.map((d) => d.data() as Project);
        setProjects(next.length ? next : []);
      },
    );
    return () => {
      unsubNotes();
      unsubProjects();
    };
  }, [user]);

  const upsertNote = useCallback(
    async (note: Note) => {
      if (!user) {
        setNotes((prev) => {
          const i = prev.findIndex((n) => n.id === note.id);
          if (i === -1) return [...prev, note];
          const copy = [...prev];
          copy[i] = note;
          return copy;
        });
        void mirrorNotesToExtension([note]);
        return;
      }
      await setDoc(doc(getDb(), "users", user.uid, "notes", note.id), note, {
        merge: true,
      });
      void mirrorNotesToExtension([note]);
    },
    [user],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!user) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        return;
      }
      await deleteDoc(doc(getDb(), "users", user.uid, "notes", noteId));
    },
    [user],
  );

  const upsertProject = useCallback(
    async (project: Project) => {
      if (!user) {
        setProjects((prev) => {
          const i = prev.findIndex((p) => p.id === project.id);
          if (i === -1) return [...prev, project];
          const copy = [...prev];
          copy[i] = project;
          return copy;
        });
        return;
      }
      await setDoc(doc(getDb(), "users", user.uid, "projects", project.id), project, {
        merge: true,
      });
    },
    [user],
  );

  const createProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Project name required");
      const project: Project = {
        id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        color: NOTE_COLORS[projects.length % NOTE_COLORS.length],
        summary: null,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await upsertProject(project);
      return project;
    },
    [projects.length, upsertProject],
  );

  const assignNoteToProject = useCallback(
    async (noteId: string, projectId: string | null) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      await upsertNote({
        ...note,
        projectId,
        updatedAt: Date.now(),
      });
    },
    [notes, upsertNote],
  );

  const refreshProjectSummary = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      const inProject = notes.filter((n) => n.projectId === projectId && !n.archived);
      const draft = buildExtractiveSummary(inProject, project.name);
      const summary = [draft.lede, ...draft.paragraphs].join("\n\n");
      await upsertProject({
        ...project,
        summary,
        tags: Array.from(new Set([...project.tags, ...draft.tags])).slice(0, 12),
        updatedAt: Date.now(),
      });
    },
    [notes, projects, upsertProject],
  );

  const importNotes = useCallback(
    async (incoming: Note[]) => {
      if (!user) {
        setNotes((prev) => {
          const map = new Map(prev.map((n) => [n.id, n]));
          for (const n of incoming) {
            const existing = map.get(n.id);
            if (!existing || n.updatedAt >= existing.updatedAt) map.set(n.id, n);
          }
          return [...map.values()];
        });
        return;
      }
      const db = getDb();
      const batch = writeBatch(db);
      for (const note of incoming) {
        batch.set(doc(db, "users", user.uid, "notes", note.id), note, { merge: true });
      }
      await batch.commit();
    },
    [user],
  );

  const value = useMemo(
    () => ({
      notes,
      projects,
      usingDemo,
      lastSyncedAt,
      upsertNote,
      deleteNote,
      upsertProject,
      createProject,
      assignNoteToProject,
      refreshProjectSummary,
      importNotes,
    }),
    [
      notes,
      projects,
      usingDemo,
      lastSyncedAt,
      upsertNote,
      deleteNote,
      upsertProject,
      createProject,
      assignNoteToProject,
      refreshProjectSummary,
      importNotes,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
