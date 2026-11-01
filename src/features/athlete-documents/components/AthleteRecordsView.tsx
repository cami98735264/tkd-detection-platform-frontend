import { Award, FolderOpen } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DocumentsPanel from "./DocumentsPanel";
import EnrollmentCertificatesPanel from "./EnrollmentCertificatesPanel";

interface Props {
  athleteId: number;
  athleteName?: string;
  canReview?: boolean;
  defaultTab?: "documentos" | "constancias";
}

/** Documents + enrollment certificates of one athlete, as tabs. */
export default function AthleteRecordsView({
  athleteId,
  athleteName,
  canReview = false,
  defaultTab = "documentos",
}: Props) {
  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="documentos">
          <FolderOpen className="mr-1.5 h-4 w-4" /> Documentos
        </TabsTrigger>
        <TabsTrigger value="constancias">
          <Award className="mr-1.5 h-4 w-4" /> Constancias
        </TabsTrigger>
      </TabsList>
      <TabsContent value="documentos">
        <DocumentsPanel athleteId={athleteId} athleteName={athleteName} canReview={canReview} />
      </TabsContent>
      <TabsContent value="constancias">
        <EnrollmentCertificatesPanel athleteId={athleteId} />
      </TabsContent>
    </Tabs>
  );
}
