import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ExamsPanel from "../components/ExamsPanel";
import PermissionsPanel from "../components/PermissionsPanel";
import PromotionsPanel from "../components/PromotionsPanel";
import { useBelts } from "../hooks/useBelts";

/** Maestro: promotion exams, the promotions/diploma registry and permissions. */
export default function PromotionsAdminPage() {
  const belts = useBelts();
  const [promotionsReload, setPromotionsReload] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluación"
        title="Ascensos de cinturón"
        description="Exámenes de ascenso con criterios técnicos y requisitos administrativos, registro de ascensos y diplomas, y permisos de descarga."
      />
      <Tabs defaultValue="exams">
        <TabsList className="flex-wrap">
          <TabsTrigger value="exams">Exámenes</TabsTrigger>
          <TabsTrigger value="promotions">Ascensos y diplomas</TabsTrigger>
          <TabsTrigger value="permissions">Permisos de diplomas</TabsTrigger>
        </TabsList>
        <TabsContent value="exams" className="pt-4">
          <ExamsPanel belts={belts} onPromotionCreated={() => setPromotionsReload((n) => n + 1)} />
        </TabsContent>
        <TabsContent value="promotions" className="pt-4">
          <PromotionsPanel belts={belts} reloadKey={promotionsReload} />
        </TabsContent>
        <TabsContent value="permissions" className="pt-4">
          <PermissionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
