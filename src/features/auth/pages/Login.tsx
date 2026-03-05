import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/features/auth/api/authApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

export default function Login() {
  const navigate = useNavigate();
  const { handleError } = useApiErrorHandler();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.login({ email, password });
      navigate("/dashboard");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-900">

      <Card className="w-[420px] shadow-2xl">
        <CardHeader className="text-center space-y-3">

          <div className="flex justify-center">
            <div className="bg-green-600 p-3 rounded-full">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>

          <CardTitle className="text-2xl">
            Warriors TKD
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Sistema Administrativo
          </p>

        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@warriors.com"
                value={email}
                onChange={handleEmailChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="123456"
                value={password}
                onChange={handlePasswordChange}
              />
            </div>

            {/* Removed inline error — errors are now shown via toast */}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>

            <div className="flex justify-between text-sm mt-2">

              <Link
                to="/forgot-password"
                className="text-green-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>

              <Link
                to="/register"
                className="text-green-700 hover:underline"
              >
                Crear cuenta
              </Link>

            </div>

          </form>
        </CardContent>

      </Card>

    </div>
  );
}
