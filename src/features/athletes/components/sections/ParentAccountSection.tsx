import { useCallback } from "react";
import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AsyncSelectField from "@/components/common/AsyncSelectField";
import { FormSelect } from "@/components/common/FormSelect";

import { usersApi } from "@/features/users/api/usersApi";

import {
  RELATIONSHIP_OPTIONS,
  type AccountMode,
  type ParentAccountState,
} from "./types";

export interface ParentAccountErrors {
  parent_relationship?: string;
  parent_email?: string;
  parent_password?: string;
  parent_full_name?: string;
  parent_user_id?: string;
}

interface Props {
  data: ParentAccountState;
  onChange: (patch: Partial<ParentAccountState>) => void;
  /** Optional copy override above the card. */
  description?: string;
  errors?: ParentAccountErrors;
  /** Set when entered parent email already belongs to a User. */
  emailExistsHint?: boolean;
  onLinkExistingEmail?: () => void;
}

export default function ParentAccountSection({
  data,
  onChange,
  description = "El deportista es menor de edad. Vincula o crea la cuenta del acudiente.",
  errors,
  emailExistsHint = false,
  onLinkExistingEmail,
}: Props) {
  const loadParentUsers = useCallback((input: string, page: number) => {
    return usersApi
      .list({ page, search: input, role: "parent" })
      .then((res) => ({
        options: res.results.map((u) => ({
          value: u.id,
          label: `${u.full_name} (${u.email})`,
        })),
        hasMore: res.next !== null,
      }));
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="space-y-1.5">
        <Label htmlFor="parent_relationship">Parentesco *</Label>
        <FormSelect
          id="parent_relationship"
          value={data.parent_relationship}
          onValueChange={(v) => onChange({ parent_relationship: v })}
          placeholder="Selecciona el parentesco"
          options={RELATIONSHIP_OPTIONS}
        />
        {errors?.parent_relationship && (
          <p className="text-sm text-error">{errors.parent_relationship}</p>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <Tabs
            value={data.parent_mode}
            onValueChange={(v) => onChange({ parent_mode: v as AccountMode })}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Cuenta existente</TabsTrigger>
              <TabsTrigger value="create">Crear cuenta nueva</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="pt-2">
              <AsyncSelectField
                value={data.parent_user_id}
                onChange={(v) => onChange({ parent_user_id: v })}
                loadOptions={loadParentUsers}
                placeholder="Buscar acudiente por nombre o correo..."
              />
              {errors?.parent_user_id && (
                <p className="text-sm text-error mt-1">{errors.parent_user_id}</p>
              )}
            </TabsContent>

            <TabsContent value="create" className="pt-2 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="parent_full_name">Nombre completo *</Label>
                <Input
                  id="parent_full_name"
                  value={data.parent_full_name}
                  onChange={(e) => onChange({ parent_full_name: e.target.value })}
                  placeholder="Nombre del acudiente"
                />
                {errors?.parent_full_name && (
                  <p className="text-sm text-error">{errors.parent_full_name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parent_email">Email *</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={data.parent_email}
                  onChange={(e) => onChange({ parent_email: e.target.value })}
                  placeholder="email@ejemplo.com"
                  autoComplete="off"
                />
                {errors?.parent_email && (
                  <p className="text-sm text-error">{errors.parent_email}</p>
                )}
                {emailExistsHint && onLinkExistingEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={onLinkExistingEmail}
                  >
                    <Link2 size={14} className="mr-1" /> Vincular cuenta existente
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parent_password">Contraseña *</Label>
                <Input
                  id="parent_password"
                  type="password"
                  value={data.parent_password}
                  onChange={(e) => onChange({ parent_password: e.target.value })}
                  placeholder="Min. 8 caracteres con mayús., minús., dígito y símbolo"
                  autoComplete="new-password"
                />
                {errors?.parent_password && (
                  <p className="text-sm text-error">{errors.parent_password}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
