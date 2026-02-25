import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (email === "admin@warriors.com" && password === "123456") {
      localStorage.setItem("auth", "true");
      navigate("/dashboard");
    } else {
      setError("Credenciales incorrectas");
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

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Iniciar Sesión
            </Button>

            {/* ENLACES NUEVOS */}
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