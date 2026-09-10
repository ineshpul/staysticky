"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSavedExtensionId,
  isExtensionLinked,
} from "@/lib/extension-sync";

/** Live extension link flag for onboarding / library gates. */
export function useExtensionLink() {
  const [linked, setLinked] = useState(false);
  const [extensionId, setExtensionId] = useState("");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setLinked(isExtensionLinked());
    setExtensionId(getSavedExtensionId());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("ss-extension-link-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ss-extension-link-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { linked, extensionId, setExtensionId, ready, refresh };
}

export function libraryEntryHref(signedIn: boolean, linked: boolean): string {
  return signedIn && linked ? "/notes" : "/onboarding";
}
