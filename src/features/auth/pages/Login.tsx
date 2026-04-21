import { useNavigate, Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/features/auth/api/authApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

const schema = Yup.object({
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),
  password: Yup.string().required("La contraseña es obligatoria"),
});

export default function Login() {
  const navigate = useNavigate();
  const { handleError } = useApiErrorHandler();

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
          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={schema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                await authApi.login(values);
                navigate("/dashboard");
              } catch (err) {
                handleError(err);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Field as={Input} id="email" type="email" name="email" placeholder="admin@warriors.com" />
                  <ErrorMessage name="email" component="p" className="text-sm text-red-500" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Field as={Input} id="password" type="password" name="password" placeholder="123456" />
                  <ErrorMessage name="password" component="p" className="text-sm text-red-500" />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Ingresando..." : "Iniciar Sesión"}
                </Button>

                <div className="flex justify-center text-sm mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-green-700 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>

      </Card>

    </div>
  );
}