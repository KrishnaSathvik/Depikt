import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReferencesTab } from "./ReferencesTab";
import { REFERENCES_COPY } from "@/lib/product";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
export function AccountContentTabs({ children }: { children: ReactNode }) {
  if (!isNativeGenerationEnabled()) return <>{children}</>;
  return (
    <Tabs defaultValue="creations">
      <TabsList>
        <TabsTrigger value="creations">Creations</TabsTrigger>
        <TabsTrigger value="references">{REFERENCES_COPY.tab}</TabsTrigger>
      </TabsList>
      <TabsContent value="creations">{children}</TabsContent>
      <TabsContent value="references">
        <ReferencesTab />
      </TabsContent>
    </Tabs>
  );
}
