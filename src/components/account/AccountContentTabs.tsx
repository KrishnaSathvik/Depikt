import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReferencesTab } from "./ReferencesTab";
import { REFERENCES_COPY } from "@/lib/product";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
/** Pill segment: white chip with a soft shadow when active (matches Pricing's interval toggle). */
const TRIGGER =
  "h-10 rounded-full px-5 text-[14px] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] data-[state=active]:bg-[color:var(--bg-elevated)] data-[state=active]:text-[color:var(--text-primary)] data-[state=active]:shadow-[0_1px_2px_rgba(17,17,17,0.08),0_4px_12px_-6px_rgba(17,17,17,0.18)]";

export function AccountContentTabs({ children }: { children: ReactNode }) {
  if (!isNativeGenerationEnabled()) return <>{children}</>;
  return (
    <Tabs defaultValue="creations">
      <TabsList className="h-auto max-w-full gap-1 overflow-x-auto rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-1">
        <TabsTrigger value="creations" className={TRIGGER}>
          Creations
        </TabsTrigger>
        <TabsTrigger value="references" className={TRIGGER}>
          {REFERENCES_COPY.tab}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="creations" className="mt-8">
        {children}
      </TabsContent>
      <TabsContent value="references" className="mt-8">
        <ReferencesTab />
      </TabsContent>
    </Tabs>
  );
}
