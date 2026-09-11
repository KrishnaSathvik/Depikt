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
import { readCachedProfile, writeCachedProfile } from "./cache";

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
    // Hydrate synchronously from this user's last-known cache before the
    // network round-trip resolves, so a page refresh repaints the same
    // avatar/name instead of a transient placeholder. Only set `loading`
    // when there's nothing cached to show yet.
    const cached = readCachedProfile(user.id);
    if (cached) {
      setProfile(cached);
    } else {
      setLoading(true);
    }
    try {
      const fresh = await getProfile();
      setProfile(fresh);
      writeCachedProfile(user.id, fresh);
    } catch {
      // Transient failure: keep whatever was already shown (cached value,
      // or the neutral loading placeholder) rather than blocking the rest
      // of the app.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: UpdateProfileInput) => {
      // Server round-trip completes (and the DB write is confirmed) before
      // touching any shared/local state -- never close a picker or update
      // the header on an optimistic guess.
      const next = await updateProfile(input);
      setProfile(next);
      if (user) writeCachedProfile(user.id, next);
      return next;
    },
    [user],
  );

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, save }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
