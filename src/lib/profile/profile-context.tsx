// Shared profile state -- one fetch per session, not one per component.
// Header/AccountMenu/Account-Profile-tab all read from here instead of each
// independently calling GET /api/account/profile. Deliberately separate
// from AuthProvider (auth-context.tsx): auth is session identity, this is
// account presentation (display name, username, avatar) -- keeping them
// apart matches how billing state (use-account-summary.ts) already stays
// out of AuthProvider too.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { getProfile, updateProfile, type ProfileResponse, type UpdateProfileInput } from "./client";

interface ProfileContextType {
  profile: ProfileResponse | null;
  loading: boolean;
  /** Re-fetch from the server (e.g. after a comment/edit made elsewhere). */
  refresh: () => Promise<void>;
  /** Server-validated update; on success the shared profile updates for every consumer. */
  save: (input: UpdateProfileInput) => Promise<ProfileResponse>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: false,
  refresh: async () => {},
  save: async () => {
    throw new Error("ProfileProvider is not mounted");
  },
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    try {
      setProfile(await getProfile());
    } catch {
      // Transient failure: header/menu fall back to a neutral avatar and
      // the email-based initial; nothing here blocks the rest of the app.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (input: UpdateProfileInput) => {
    const next = await updateProfile(input);
    setProfile(next);
    return next;
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, save }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
