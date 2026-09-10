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
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth, googleProvider } from "./firebase";
import { DEFAULT_SETTINGS, type UserProfile, type UserSettings } from "./types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureProfile(user: User): Promise<UserProfile> {
  const ref = doc(getDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  const profile: UserProfile = {
    displayName: user.displayName || "Reader",
    email: user.email || "",
    photoURL: user.photoURL,
    createdAt: Date.now(),
    settings: DEFAULT_SETTINGS,
  };
  await setDoc(ref, profile);
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const p = await ensureProfile(next);
        setProfile(p);
      } catch (err) {
        console.error(err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user || !profile) return;
      const settings = { ...profile.settings, ...patch };
      const next = { ...profile, settings };
      setProfile(next);
      await setDoc(doc(getDb(), "users", user.uid), next, { merge: true });
    },
    [user, profile],
  );

  const value = useMemo(
    () => ({ user, profile, loading, signIn, signOut, updateSettings }),
    [user, profile, loading, signIn, signOut, updateSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
