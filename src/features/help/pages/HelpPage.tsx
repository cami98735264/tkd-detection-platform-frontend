import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ayuda</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Manual de Usuario — Warriors TKD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">Panel de Control</h2>
            <p className="text-muted-foreground">
              El panel de control te permite ver métricas generales del sistema, incluyendo
              deportistas registrados, programas activos, inscripciones y evaluaciones realizadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Gestión de Deportistas</h2>
            <p className="text-muted-foreground">
              Aquí puedes registrar nuevos deportistas, actualizar su información,
              consultar su historial y cambiar su estado (activo/inactivo).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Programas y Ediciones</h2>
            <p className="text-muted-foreground">
              Los programas agrupan las distintas disciplinasoffered. Cada programa
              puede tener múltiples ediciones con fechas y horarios específicos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Inscripciones</h2>
            <p className="text-muted-foreground">
              Registra a un deportista en un programa específico. Cada inscripción
              tiene fechas de inicio y fin, y un estado (activa, completada, abandonada).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Evaluaciones</h2>
            <p className="text-muted-foreground">
              Registra las evaluaciones de cinturón de cada deportista. Cada evaluación
              incluye métricas con puntuaciones y notas del evaluador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Reportes (Admin)</h2>
            <p className="text-muted-foreground">
              Los administradores pueden generar reportes de inscripción, rendimiento,
              asistencia y personalizados. Los reportes se generan de forma asíncrona.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Gestión de Usuarios (Admin)</h2>
            <p className="text-muted-foreground">
              Los administradores pueden crear usuarios y asignar roles: Deportista,
              Acudiente o Administrador. Cada rol tiene permisos distintos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Reuniones (Admin)</h2>
            <p className="text-muted-foreground">
              Programa reuniones con título, descripción, fecha y hora.
              Gestiona las reuniones agendadas desde esta sección.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Inventario (Admin)</h2>
            <p className="text-muted-foreground">
              Controla el equipo disponible: cascos, protectores de pecho, tatamis,
              pads de patadas y palchaguis. Registra cantidad y descripción de cada ítem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Categorías de Competencia (Admin)</h2>
            <p className="text-muted-foreground">
              Define categorías con rangos de edad, cinturones y peso para las
              competencias de Taekwondo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Entrenamientos</h2>
            <p className="text-muted-foreground">
              Registra sesiones de entrenamiento indicando el tipo (fuerza, velocidad,
              agilidad, flexibilidad, sparring, poomsae, breaking, evaluación de cinturón),
              fecha, hora y número de atletas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contacto</h2>
            <p className="text-muted-foreground">
              Para soporte técnico, comunícate con el administrador del sistema
              o escribe a soporte@warriors-tkd.com
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
