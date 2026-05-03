import { PageHeader } from "@/components/common/PageHeader";

const Test = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Página de prueba"
        description="Espacio para validar el pipeline de Cloudflare Workers + React."
        eyebrow="Diagnóstico"
      />
      <p className="rounded-md bg-surface-2 px-4 py-3 text-sm text-text">
        This is a test page for the Cloudflare Workers + React app.
      </p>
    </div>
  );
};

export default Test;
