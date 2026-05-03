import { PageHeader } from "@/components/common/PageHeader";

export default function About() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sobre Warriors TKD"
        description="Una academia de Taekwondo en Espinal con foco en disciplina, técnica y constancia."
        eyebrow="Acerca de"
      />
      <article className="prose prose-sm max-w-prose text-text">
        <p className="text-base leading-relaxed text-muted">
          Warriors TKD forma deportistas con un programa estructurado de cinturones,
          evaluaciones técnicas, registros de asistencia y reportes de progreso.
          Esta plataforma centraliza la operación de la academia.
        </p>
      </article>
    </div>
  );
}
