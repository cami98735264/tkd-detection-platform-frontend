import { Compass, Home } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function NotFound() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <Logo className="h-32 w-32" alt="Warriors TKD" />
        <p className="mt-6 font-display text-7xl font-semibold tracking-tight text-text">
          404
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Sin coincidencias
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          La página que buscabas no existe
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted">
          Es posible que el enlace esté roto o que la sección haya sido movida.
          Vuelve al inicio para continuar.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/dashboard">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
          {!isAuthenticated && (
            <Button asChild variant="ghost" size="lg" className="text-muted hover:text-text">
              <Link to="/login">
                <Compass className="h-4 w-4" />
                Iniciar sesión
              </Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
