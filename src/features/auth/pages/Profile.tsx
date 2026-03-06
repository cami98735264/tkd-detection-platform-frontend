import { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Outlet } from "react-router-dom";
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

import { profileValidationSchema } from "@/validations/profile.schema";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
              AD
            </div>

            <div>
              <h2 className="text-xl font-semibold">Usuario Admin</h2>
              <p className="text-sm text-muted-foreground">
                Administrador del Sistema
              </p>
            </div>

            <Badge className="bg-green-600 mx-auto w-fit">
              Admin
            </Badge>

            <div className="border-t pt-4 mt-4 text-sm space-y-2 text-left">
              <p className="font-semibold">Empresa</p>
              <p>Warriors Gym SAS</p>
              <p>NIT: 900123456-7</p>
              <p>Espinal, Tolima</p>
              <p>Contacto: contacto@warriorsgym.com</p>
            </div>
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
                initialValues={{
                  nombres: "Admin",
                  apellidos: "Usuario",
                  telefono: "+57 300 123 4567",
                  documento: "1234567890",
                }}
                validationSchema={profileValidationSchema}
                onSubmit={(values, { setSubmitting, resetForm }) => {
                  setTimeout(() => {
                    console.log(values);

                    setSuccessMessage(
                      "Los cambios se actualizaron correctamente"
                    );

                    setIsEditing(false);
                    setSubmitting(false);
                    resetForm({ values });
                  }, 1000);
                }}
              >
                {({ isSubmitting, isValid, dirty }) => (
                  <>
                    {/* MENSAJE DE ÉXITO */}
                    {successMessage && (
                      <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                        {successMessage}
                      </div>
                    )}

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
                      </div>

                      {/* BOTONES */}
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        {!isEditing ? (
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSuccessMessage("");
                              setIsEditing(true);
                            }}
                          >
                            Editar
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!isValid}
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
                  </>
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