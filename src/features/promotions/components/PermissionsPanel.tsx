import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { parentAthletesApi } from "@/features/parent/api/parentAthletesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { promotionsApi } from "../api/promotionsApi";
import type { DiplomaPermission } from "../types";

interface Candidate {
  user: number;
  label: string;
}

/**
 * Maestro grants the athlete himself or a linked parent the right to register
 * promotions / upload scans and to download the auto-generated diplomas.
 */
export default function PermissionsPanel() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [perms, setPerms] = useState<DiplomaPermission[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newUser, setNewUser] = useState<number | null>(null);
  const [canRegister, setCanRegister] = useState(true);
  const [canDownload, setCanDownload] = useState(true);

  const load = useCallback(() => {
    if (!athleteId) {
      setPerms([]);
      return;
    }
    promotionsApi
      .listPermissions(athleteId)
      .then((list) => setPerms(list.filter((p) => !p.revoked_at)))
      .catch(handleError);
  }, [athleteId, handleError]);

  useEffect(() => {
    load();
  }, [load]);

  // Who can hold a permission: the athlete's own account and linked parents.
  useEffect(() => {
    if (!athleteId) {
      setCandidates([]);
      return;
    }
    let alive = true;
    (async () => {
      const out: Candidate[] = [];
      try {
        const athlete = await athletesApi.get(athleteId);
        if (athlete?.user)
          out.push({ user: athlete.user, label: `${athlete.full_name} (deportista)` });
        const parents = await parentAthletesApi.list(1, athlete?.full_name ?? "");
        for (const link of parents?.results ?? []) {
          if (link.athlete !== athleteId) continue;
          out.push({
            user: link.parent,
            label: `${link.parent_full_name || link.parent_email} (acudiente)`,
          });
        }
      } catch {
        // Leave whatever was collected; the admin can retry by reselecting.
      }
      if (alive) {
        setCandidates(out);
        setNewUser(out[0]?.user ?? null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [athleteId]);

  const grant = async () => {
    if (!athleteId || !newUser) return;
    try {
      await promotionsApi.createPermission({
        athlete: athleteId,
        user: newUser,
        can_register: canRegister,
        can_download_generated: canDownload,
      });
      showToast({ title: "Permiso otorgado", variant: "success" });
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const patch = async (
    p: DiplomaPermission,
    data: Partial<Pick<DiplomaPermission, "can_register" | "can_download_generated">>,
  ) => {
    try {
      const updated = await promotionsApi.updatePermission(p.id, data);
      setPerms((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...data, ...updated } : x)));
    } catch (err) {
      handleError(err);
    }
  };

  const revoke = async (p: DiplomaPermission) => {
    const ok = await confirm({
      title: "Revocar permiso",
      description: `¿Revocar los permisos de diplomas de ${p.user_name ?? "este usuario"}?`,
    });
    if (!ok) return;
    try {
      await promotionsApi.revokePermission(p.id);
      showToast({ title: "Permiso revocado", variant: "success" });
      load();
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-4">
      <AthletePicker className="sm:w-80" value={athleteId} onChange={setAthleteId} />
      {!athleteId ? (
        <Card>
          <EmptyState
            icon={KeyRound}
            title="Selecciona un deportista"
            description="Elige un deportista para ver y gestionar quién puede registrar o descargar sus diplomas."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permisos activos</CardTitle>
            </CardHeader>
            <CardContent>
              {perms.length === 0 ? (
                <p className="text-sm text-muted">
                  Nadie tiene permisos de diplomas para este deportista.
                </p>
              ) : (
                <ul className="divide-y divide-divider">
                  {perms.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-text">
                          {p.user_name ?? `Usuario #${p.user}`}
                        </p>
                        {p.user_email && <p className="text-xs text-faint">{p.user_email}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={p.can_register}
                            onCheckedChange={(v) => void patch(p, { can_register: v })}
                            aria-label="Puede registrar"
                          />
                          Registrar
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={p.can_download_generated}
                            onCheckedChange={(v) => void patch(p, { can_download_generated: v })}
                            aria-label="Puede descargar"
                          />
                          Descargar generados
                        </label>
                        <Button size="sm" variant="ghost" onClick={() => void revoke(p)}>
                          <Trash2 className="h-4 w-4" />
                          Revocar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Otorgar permiso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">
                  El deportista no tiene cuenta de usuario ni acudientes vinculados.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5 sm:w-80">
                    <Label htmlFor="perm-user">Usuario</Label>
                    <NativeSelect
                      id="perm-user"
                      value={newUser ?? ""}
                      onChange={(e) => setNewUser(Number(e.target.value) || null)}
                    >
                      {candidates.map((c) => (
                        <option key={c.user} value={c.user}>
                          {c.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={canRegister}
                        onCheckedChange={(v) => setCanRegister(v === true)}
                      />
                      Registrar ascensos y subir diplomas
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={canDownload}
                        onCheckedChange={(v) => setCanDownload(v === true)}
                      />
                      Descargar diplomas generados
                    </label>
                  </div>
                  <Button onClick={() => void grant()} disabled={!newUser}>
                    <Plus className="h-4 w-4" />
                    Otorgar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
