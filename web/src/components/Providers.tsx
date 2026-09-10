"use client";

import { AuthProvider } from "@/lib/auth";
import { LibraryProvider } from "@/lib/library";
import { ExtensionSync } from "@/components/ExtensionSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LibraryProvider>
        <ExtensionSync />
        {children}
      </LibraryProvider>
    </AuthProvider>
  );
}
