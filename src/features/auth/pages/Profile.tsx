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
import * as Yup from "yup";

import { profileValidationSchema } from "@/validations/profile.schema";
import { profileApi } from "@/features/auth/api/profileApi";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import FormModal from "@/components/common/FormModal";
import { PageHeader } from "@/components/common/PageHeader";
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

const passwordSchema = Yup.object({
  current_password: Yup.string().required("Contraseña actual obligatoria"),
  new_password: Yup.string()
    .min(8, "Mínimo 8 caracteres")
    .required("Nueva contraseña obligatoria"),
  confirm_password: Yup.string()
    .oneOf([Yup.ref("new_password")], "Las contraseñas deben coincidir")
    .required("Confirmación obligatoria"),
});

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

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
      <PageHeader
        title="Mi perfil"
        description="Administra la información de tu cuenta y preferencias."
        eyebrow="Cuenta"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PERFIL LATERAL */}
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground font-display text-3xl font-semibold tracking-tight">
              {user ? getInitials(user.full_name) : "??"}
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-text">
                {user?.full_name ?? "—"}
              </h2>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>

            <Badge variant="tonal" className="mx-auto w-fit">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </Badge>

            {profile && (
              <div className="border-t border-divider pt-4 mt-4 text-sm space-y-2 text-left">
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
                          className="text-sm text-error"
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
                          className="text-sm text-error"
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
                          className="text-sm text-error"
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
                          className="text-sm text-error"
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
                          className="text-sm text-error"
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
                          className="text-sm text-error"
                        />
                      </div>
                    </div>

                    {/* BOTONES */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-divider">
                      {!isEditing ? (
                        <Button
                          type="button"
                         
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

              <Button
                variant="outline"
                onClick={() => setPasswordModalOpen(true)}
              >
                Cambiar contraseña
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Change Password Modal */}
      <FormModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        title="Cambiar Contraseña"
      >
        {!passwordModalOpen ? null : (
          <Formik
            initialValues={{
              current_password: "",
              new_password: "",
              confirm_password: "",
            }}
            validationSchema={passwordSchema}
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              try {
                await authApi.changePassword({
                  current_password: values.current_password,
                  new_password: values.new_password,
                });
                showToast({
                  title: "Contraseña actualizada",
                  description: "Tu contraseña ha sido cambiada exitosamente.",
                  variant: "success",
                });
                setPasswordModalOpen(false);
                resetForm();
              } catch (err) {
                handleError(err);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="space-y-1">
                  <Label>Contraseña Actual</Label>
                  <Field as={Input} type="password" name="current_password" />
                  <ErrorMessage name="current_password" component="p" className="text-sm text-error" />
                </div>
                <div className="space-y-1">
                  <Label>Nueva Contraseña</Label>
                  <Field as={Input} type="password" name="new_password" />
                  <ErrorMessage name="new_password" component="p" className="text-sm text-error" />
                </div>
                <div className="space-y-1">
                  <Label>Confirmar Nueva Contraseña</Label>
                  <Field as={Input} type="password" name="confirm_password" />
                  <ErrorMessage name="confirm_password" component="p" className="text-sm text-error" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Cambiar"}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </FormModal>
    </div>
  );
}
