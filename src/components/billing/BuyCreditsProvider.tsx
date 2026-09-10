import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { BuyCreditsSheet } from "@/components/billing/BuyCreditsSheet";

interface BuyCreditsContextValue {
  open: boolean;
  openBuyCredits: (source?: string) => void;
  closeBuyCredits: () => void;
}

const BuyCreditsContext = createContext<BuyCreditsContextValue>({
  open: false,
  openBuyCredits: () => {},
  closeBuyCredits: () => {},
});

/**
 * One BuyCreditsSheet for the whole app, openable from the Account page,
 * the account menu, and the out-of-credits panel — nowhere else.
 */
export function BuyCreditsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string | undefined>(undefined);
  const openBuyCredits = useCallback((s?: string) => {
    setSource(s);
    setOpen(true);
  }, []);
  const closeBuyCredits = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, openBuyCredits, closeBuyCredits }),
    [open, openBuyCredits, closeBuyCredits],
  );
  return (
    <BuyCreditsContext.Provider value={value}>
      {children}
      <BuyCreditsSheet open={open} onOpenChange={setOpen} source={source} />
    </BuyCreditsContext.Provider>
  );
}

export const useBuyCredits = () => useContext(BuyCreditsContext);
