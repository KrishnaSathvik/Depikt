import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { privateScope, isCurrentPrivateScope, type PrivateScope } from "@/lib/private-cache";
const AccountHub = lazy(() => import("./AccountHub").then((m) => ({ default: m.AccountHub })));
import type { CreationItem } from "@/lib/profile/client";

/**
 * The AccountHub's six views. "home" is always the bottom of the stack --
 * it shows identity, Plan & Credits (see [[CreditsCard]]), and the full
 * Creations grid all at once (no separate Creations click); the other
 * views are reached from home (avatar/pencil, Upgrade, Buy credits, a
 * Creations thumbnail -> creation-detail). "upgrade" and "buy-credits"
 * both stay inside the hub -- never a navigation to /pricing, and never a
 * second, separate dialog stacked on top of the profile. See
 * AccountHub.tsx for the shell that renders whichever view is on top.
 */
export type HubView =
  | "home"
  | "creation-detail"
  | "edit-profile"
  | "avatar-picker"
  | "upgrade"
  | "buy-credits";

interface AccountHubContextValue {
  open: boolean;
  /** Current view is the last entry; length > 1 means a back arrow shows. */
  stack: HubView[];
  selectedCreation: CreationItem | null;
  /** Opens the hub fresh at `view` (default "home"). Resets any prior stack. */
  openHub: (view?: HubView) => void;
  /**
   * Navigate to `view`. If the hub is already open this pushes onto the
   * current stack (e.g. Creations -> a thumbnail); if it's closed this
   * opens it fresh at that view with "home" underneath, so every entry
   * point -- header avatar, an avatar/pencil tap on the full /account
   * page, a Creations thumbnail on that same page -- behaves the same way
   * and back always has somewhere sane to land.
   */
  pushView: (view: HubView) => void;
  openCreationDetail: (item: CreationItem) => void;
  back: () => void;
  closeHub: () => void;
}

const AccountHubContext = createContext<AccountHubContextValue | null>(null);

export function AccountHubProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [scope, setScope] = useState<PrivateScope | null>(null);
  const [requestedOpen, setOpen] = useState(false);
  const [stack, setStack] = useState<HubView[]>(["home"]);
  const [selectedCreation, setSelectedCreation] = useState<CreationItem | null>(null);

  const open =
    requestedOpen && !!scope && scope.userId === user?.id && isCurrentPrivateScope(scope);
  const openHub = useCallback(
    (view: HubView = "home") => {
      setScope(user ? privateScope(user.id) : null);
      setStack(view === "home" ? ["home"] : ["home", view]);
      setOpen(true);
    },
    [user],
  );

  const pushView = useCallback(
    (view: HubView) => {
      setScope(user ? privateScope(user.id) : null);
      setOpen(() => {
        const wasOpen = open;
        setStack((prev) =>
          wasOpen ? [...prev, view] : view === "home" ? ["home"] : ["home", view],
        );
        return true;
      });
    },
    [user, open],
  );

  const openCreationDetail = useCallback(
    (item: CreationItem) => {
      setSelectedCreation(item);
      pushView("creation-detail");
    },
    [pushView],
  );

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const closeHub = useCallback(() => {
    setOpen(false);
    // Reset for next time after the close animation would have finished --
    // no need to remember where someone was once they've fully left.
    setStack(["home"]);
    setSelectedCreation(null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      stack,
      selectedCreation,
      openHub,
      pushView,
      openCreationDetail,
      back,
      closeHub,
    }),
    [open, stack, selectedCreation, openHub, pushView, openCreationDetail, back, closeHub],
  );

  return (
    <AccountHubContext.Provider value={value}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <AccountHub key={`${scope?.userId}:${scope?.epoch}`} />
        </Suspense>
      )}
    </AccountHubContext.Provider>
  );
}

export function useAccountHub(): AccountHubContextValue {
  const ctx = useContext(AccountHubContext);
  if (!ctx) throw new Error("useAccountHub must be used within AccountHubProvider");
  return ctx;
}
