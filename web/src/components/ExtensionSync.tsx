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

const POLL_MS = 15000;

/** Keeps extension ↔ Firestore sync running after the first successful link.
 *  Does not invent projects — notes stay ungrouped until tagged explicitly. */
export function ExtensionSync() {
  const { user, profile } = useAuth();
  const { notes, importNotes } = useLibrary();
  const notesRef = useRef(notes);
  notesRef.current = notes;

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
      await importNotes(merged);
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
  }, [user, profile?.settings.syncEnabled, importNotes]);

  return null;
}
