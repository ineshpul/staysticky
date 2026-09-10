"use client";

import { AuthProvider } from "@/lib/auth";
import { LibraryProvider } from "@/lib/library";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LibraryProvider>{children}</LibraryProvider>
    </AuthProvider>
  );
}
