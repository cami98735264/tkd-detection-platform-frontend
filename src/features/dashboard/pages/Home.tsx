import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";

interface StatCard {
  label: string;
  value: number | null;
  icon: React.ElementType;
}

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<StatCard[]>([
    { label: "Deportistas", value: null, icon: Users },
    { label: "Programas", value: null, icon: BookOpen },
    { label: "Inscripciones", value: null, icon: ClipboardList },
    { label: "Evaluaciones", value: null, icon: CheckCircle },
  ]);

  useEffect(() => {
    Promise.allSettled([
      athletesApi.list(1),
      programsApi.list(1),
      enrollmentsApi.list(1),
      evaluationsApi.list(1),
    ]).then(([ath, prog, enr, eva]) => {
      setStats([
        {
          label: "Deportistas",
          value: ath.status === "fulfilled" ? ath.value.count : 0,
          icon: Users,
        },
        {
          label: "Programas",
          value: prog.status === "fulfilled" ? prog.value.count : 0,
          icon: BookOpen,
        },
        {
          label: "Inscripciones",
          value: enr.status === "fulfilled" ? enr.value.count : 0,
          icon: ClipboardList,
        },
        {
          label: "Evaluaciones",
          value: eva.status === "fulfilled" ? eva.value.count : 0,
          icon: CheckCircle,
        },
      ]);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Bienvenido{user ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Panel de administración de Warriors TKD
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stat.value === null ? "..." : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
