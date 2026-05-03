import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  Mail,
  Package,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";

interface Section {
  icon: LucideIcon;
  title: string;
  body: string;
  audience?: string;
}

const SECTIONS: Section[] = [
  {
    icon: BookOpen,
    title: "Panel de control",
    body: "Vista general con métricas del sistema: deportistas registrados, programas activos, inscripciones y evaluaciones realizadas.",
  },
  {
    icon: Users,
    title: "Gestión de deportistas",
    body: "Registra nuevos deportistas, actualiza su información, consulta su historial y cambia su estado entre activo e inactivo.",
  },
  {
    icon: BookOpen,
    title: "Programas y ediciones",
    body: "Los programas agrupan las disciplinas que ofrece la academia. Cada programa puede tener múltiples ediciones con fechas y horarios específicos.",
  },
  {
    icon: ClipboardList,
    title: "Inscripciones",
    body: "Registra a un deportista en un programa específico. Cada inscripción tiene fechas de inicio y fin, y un estado (activa, completada o retirado).",
  },
  {
    icon: ShieldCheck,
    title: "Evaluaciones",
    body: "Registra evaluaciones de cinturón de cada deportista. Cada evaluación incluye métricas con puntuaciones y notas del evaluador.",
  },
  {
    icon: Trophy,
    title: "Reportes",
    body: "Genera reportes de inscripción, rendimiento, asistencia y personalizados. Los reportes se generan de forma asíncrona y aparecen en la lista cuando estén listos.",
    audience: "Administrador",
  },
  {
    icon: Users,
    title: "Gestión de usuarios",
    body: "Crea usuarios y asigna roles: Deportista, Acudiente o Administrador. Cada rol tiene permisos distintos y vistas adaptadas.",
    audience: "Administrador",
  },
  {
    icon: Calendar,
    title: "Reuniones",
    body: "Programa reuniones con título, descripción, fecha y hora. Los acudientes y deportistas confirman su asistencia desde su panel.",
    audience: "Administrador",
  },
  {
    icon: Package,
    title: "Inventario",
    body: "Controla el equipo disponible: cascos, protectores de pecho, tatamis, pads de patadas y palchaguis. Registra cantidad y descripción de cada ítem.",
    audience: "Administrador",
  },
  {
    icon: Trophy,
    title: "Categorías de competencia",
    body: "Define categorías con rangos de edad, cinturones y peso para las competencias de Taekwondo.",
    audience: "Administrador",
  },
  {
    icon: Dumbbell,
    title: "Entrenamientos",
    body: "Registra sesiones indicando el tipo (fuerza, velocidad, agilidad, flexibilidad, sparring, poomsae, breaking, evaluación de cinturón), fecha, hora y número de atletas.",
  },
  {
    icon: ClipboardCheck,
    title: "Asistencia",
    body: "Lleva el registro de asistencia por sesión: presente, tarde o ausente. Los reportes de asistencia ayudan a medir el compromiso del deportista.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayuda"
        description="Guía rápida sobre cada módulo del sistema."
        eyebrow="Manual de usuario"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-semibold tracking-tight text-text">
                        {section.title}
                      </h2>
                      {section.audience && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-faint">
                          {section.audience}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {section.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-base font-semibold tracking-tight text-text">
                ¿Necesitas más ayuda?
              </p>
              <p className="text-sm text-muted">
                Contacta al administrador o escribe a soporte@warriors-tkd.com
              </p>
            </div>
          </div>
          <a
            href="mailto:soporte@warriors-tkd.com"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            soporte@warriors-tkd.com
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
