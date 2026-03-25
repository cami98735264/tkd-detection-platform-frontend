import { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { profileValidationSchema } from "@/validations/profile.schema";
import { profileApi } from "@/features/auth/api/profileApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Profile as ProfileType } from "@/types/entities";

const ROLE_LABELS: Record<string, string> = {
  administrator: "Admin",
  sportsman: "Deportista",
  parent: "Acudiente",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);

  useEffect(() => {
    profileApi
      .get()
      .then(setProfile)
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const initialValues = {
    nombres: profile?.nombres ?? "",
    apellidos: profile?.apellidos ?? "",
    telefono: profile?.telefono ?? "",
    documento: profile?.documento ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    address: profile?.address ?? "",
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">
          Administra la información de tu cuenta y preferencias.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PERFIL LATERAL */}
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto h-24 w-24 rounded-full bg-green-600 flex items-center justify-center text-white text-3xl font-bold">
              {user ? getInitials(user.full_name) : "??"}
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {user?.full_name ?? "—"}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <Badge className="bg-green-600 mx-auto w-fit">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </Badge>

            {profile && (
              <div className="border-t pt-4 mt-4 text-sm space-y-2 text-left">
                <p>
                  <span className="font-semibold">Documento:</span>{" "}
                  {profile.documento || "—"}
                </p>
                <p>
                  <span className="font-semibold">Teléfono:</span>{" "}
                  {profile.telefono || "—"}
                </p>
                {profile.address && (
                  <p>
                    <span className="font-semibold">Dirección:</span>{" "}
                    {profile.address}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FORMULARIO */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>

            <CardContent>
              <Formik
                initialValues={initialValues}
                enableReinitialize
                validationSchema={profileValidationSchema}
                onSubmit={async (values, { setSubmitting, resetForm }) => {
                  try {
                    const updated = await profileApi.update({
                      nombres: values.nombres,
                      apellidos: values.apellidos,
                      telefono: values.telefono,
                      documento: values.documento,
                      date_of_birth: values.date_of_birth || null,
                      address: values.address,
                    });
                    setProfile(updated);
                    showToast({
                      title: "Perfil actualizado",
                      description:
                        "Los cambios se guardaron correctamente.",
                      variant: "success",
                    });
                    setIsEditing(false);
                    resetForm({ values });
                  } catch (err) {
                    handleError(err);
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {({ isSubmitting, isValid, dirty }) => (
                  <Form className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Nombres</Label>
                        <Field
                          as={Input}
                          name="nombres"
                          disabled={!isEditing}
                        />
                        <ErrorMessage
                          name="nombres"
                          component="p"
                          className="text-sm text-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Apellidos</Label>
                        <Field
                          as={Input}
                          name="apellidos"
                          disabled={!isEditing}
                        />
                        <ErrorMessage
                          name="apellidos"
                          component="p"
                          className="text-sm text-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Teléfono</Label>
                        <Field
                          as={Input}
                          name="telefono"
                          disabled={!isEditing}
                        />
                        <ErrorMessage
                          name="telefono"
                          component="p"
                          className="text-sm text-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Documento</Label>
                        <Field
                          as={Input}
                          name="documento"
                          disabled={!isEditing}
                        />
                        <ErrorMessage
                          name="documento"
                          component="p"
                          className="text-sm text-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Fecha de nacimiento</Label>
                        <Field
                          as={Input}
                          type="date"
                          name="date_of_birth"
                          disabled={!isEditing}
                        />
                        <ErrorMessage
                          name="date_of_birth"
                          component="p"
                          className="text-sm text-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Dirección</Label>
                        <Field
                          as={Input}
                          name="address"
                          disabled={!isEditing}
                        />
                        <ErrorMessage
                          name="address"
                          component="p"
                          className="text-sm text-red-500"
                        />
                      </div>
                    </div>

                    {/* BOTONES */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      {!isEditing ? (
                        <Button
                          type="button"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setIsEditing(true)}
                        >
                          Editar
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancelar
                          </Button>

                          <Button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={
                              isSubmitting || !isValid || !dirty
                            }
                          >
                            {isSubmitting
                              ? "Guardando..."
                              : "Guardar Cambios"}
                          </Button>
                        </>
                      )}
                    </div>
                  </Form>
                )}
              </Formik>
            </CardContent>
          </Card>

          {/* SEGURIDAD */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Seguridad</CardTitle>

              <Button className="bg-blue-600 hover:bg-blue-700">
                Cambiar contraseña
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
