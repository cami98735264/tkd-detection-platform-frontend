import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ShieldOff, Copy, Download, KeyRound, MonitorSmartphone } from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { authApi } from "@/features/auth/api/authApi";
import {
  twoFactorApi,
  type TwoFactorStatus,
  type TwoFactorSetup,
  type TrustedDevice,
} from "@/features/auth/api/twoFactorApi";
import { ApiError } from "@/types/api";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import FormModal from "@/components/common/FormModal";

type WizardStep = "scan" | "activate" | "recovery";

function downloadCodes(codes: string[]) {
  const blob = new Blob([codes.join("\n") + "\n"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "codigos-recuperacion-tkd.txt";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Profile Security: TOTP two-factor management (2fa-contract §4/§7).
 *  - Disabled → enable wizard (QR + manual secret → activate → recovery codes once).
 *  - Enabled  → status + remaining count, regenerate (re-auth), disable (re-auth +
 *    optional sign-out-everywhere), trusted-device list with revoke / revoke-all.
 */
export default function TwoFactorSection() {
  const { user, setAuthenticated } = useAuthStore();
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [trusted, setTrusted] = useState<TrustedDevice[]>([]);

  // Enable wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("scan");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [activateCode, setActivateCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Re-auth dialogs (regenerate / disable)
  const [regenOpen, setRegenOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me();
      setAuthenticated(fresh);
    } catch {
      /* non-fatal */
    }
  }, [setAuthenticated]);

  const loadStatus = useCallback(async () => {
    try {
      const s = await twoFactorApi.status();
      setStatus(s);
      if (s.enabled) setTrusted(await twoFactorApi.listTrustedDevices());
      else setTrusted([]);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (!user) return null;

  const enabled = status?.enabled ?? user.has_2fa ?? false;

  // --- enable wizard --------------------------------------------------------

  const openWizard = async () => {
    setBusy(true);
    try {
      const s = await twoFactorApi.setup();
      setSetup(s);
      setStep("scan");
      setActivateCode("");
      setCodeError(null);
      setWizardOpen(true);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitActivate = async () => {
    setCodeError(null);
    setBusy(true);
    try {
      const res = await twoFactorApi.activate(activateCode.trim());
      setRecoveryCodes(res.recovery_codes);
      setStep("recovery");
      await refreshUser();
      await loadStatus();
    } catch (err) {
      if (err instanceof ApiError && err.hasFieldCode("code", "invalid_code")) {
        setCodeError("El código no es válido. Verifícalo e inténtalo de nuevo.");
      } else {
        handleError(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const finishWizard = () => {
    setWizardOpen(false);
    setSetup(null);
    setRecoveryCodes([]);
    setActivateCode("");
    showToast({ title: "Verificación en dos pasos activada", variant: "success" });
  };

  const copyCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      showToast({ title: "Códigos copiados", variant: "success" });
    } catch {
      /* clipboard may be unavailable */
    }
  };

  // --- trusted devices ------------------------------------------------------

  const revokeDevice = async (id: number) => {
    try {
      await twoFactorApi.revokeTrustedDevice(id);
      await loadStatus();
      showToast({ title: "Dispositivo revocado", variant: "success" });
    } catch (err) {
      handleError(err);
    }
  };

  const revokeAllDevices = async () => {
    try {
      await twoFactorApi.revokeAllTrustedDevices();
      await loadStatus();
      showToast({ title: "Dispositivos revocados", variant: "success" });
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Verificación en dos pasos</h3>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Tu cuenta pide un código de tu aplicación de autenticación al iniciar sesión."
                : "Agrega una capa extra de seguridad con una aplicación de autenticación."}
            </p>
          </div>
          {!enabled ? (
            <Button variant="outline" onClick={openWizard} disabled={busy}>
              {busy ? "Cargando..." : "Activar"}
            </Button>
          ) : null}
        </div>

        {enabled && status ? (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <KeyRound className="h-4 w-4 text-primary" />
              <span>
                Códigos de recuperación restantes:{" "}
                <strong>{status.recovery_codes_remaining}</strong>
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
                  Regenerar códigos
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
                  Desactivar
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MonitorSmartphone className="h-4 w-4 text-primary" />
                  Dispositivos de confianza
                </p>
                {trusted.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={revokeAllDevices}>
                    Revocar todos
                  </Button>
                ) : null}
              </div>
              {trusted.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tienes dispositivos recordados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {trusted.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.device_label || "Dispositivo"}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.ip}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => revokeDevice(d.id)}>
                        Revocar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Enable wizard */}
      <FormModal
        open={wizardOpen}
        onOpenChange={(open) => {
          // Don't allow dismissing while the one-time recovery codes are shown.
          if (!open && step === "recovery") return;
          setWizardOpen(open);
        }}
        title="Activar verificación en dos pasos"
      >
        {step === "scan" && setup ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escanea este código QR con tu aplicación de autenticación (Google
              Authenticator, Authy, etc.).
            </p>
            <div className="flex justify-center rounded-lg border border-border bg-white p-4">
              <QRCodeSVG
                value={setup.otpauth_uri}
                size={192}
                marginSize={4}
                title="Código QR para configurar la verificación en dos pasos"
              />
            </div>
            <div className="space-y-1.5">
              <Label>¿No puedes escanear? Ingresa esta clave manualmente</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-surface-2 px-2 py-1.5 text-xs text-text">
                  {setup.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyCodes([setup.secret])}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep("activate")}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {step === "activate" ? (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && activateCode.trim()) void submitActivate();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Ingresa el código de 6 dígitos que muestra tu aplicación.
            </p>
            <div className="space-y-1.5" data-field="code">
              <Label htmlFor="activate_code">Código</Label>
              <Input
                id="activate_code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={activateCode}
                onChange={(e) => {
                  setActivateCode(e.target.value);
                  setCodeError(null);
                }}
              />
              {codeError ? <p role="alert" className="text-sm text-error">{codeError}</p> : null}
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep("scan")}>
                Atrás
              </Button>
              <Button type="submit" disabled={busy || !activateCode.trim()}>
                {busy ? "Verificando..." : "Activar"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "recovery" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Guarda estos códigos de recuperación en un lugar seguro. Son la única
              forma de entrar si pierdes tu aplicación. <strong>No volverán a mostrarse.</strong>
            </p>
            <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-4">
              {recoveryCodes.map((c) => (
                <li key={c} className="font-mono text-sm">{c}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copyCodes(recoveryCodes)}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => downloadCodes(recoveryCodes)}>
                <Download className="mr-2 h-4 w-4" /> Descargar
              </Button>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={finishWizard}>
                Ya los guardé
              </Button>
            </div>
          </div>
        ) : null}
      </FormModal>

      <ReAuthDialog
        open={regenOpen}
        onOpenChange={setRegenOpen}
        title="Regenerar códigos de recuperación"
        confirmLabel="Regenerar"
        onConfirm={async ({ password, code }) => {
          const codes = await twoFactorApi.regenerateRecoveryCodes({ password, code });
          await loadStatus();
          setRegenOpen(false);
          setRecoveryCodes(codes);
          setStep("recovery");
          setWizardOpen(true);
        }}
      />

      <ReAuthDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title="Desactivar verificación en dos pasos"
        confirmLabel="Desactivar"
        withSignOut
        onConfirm={async ({ password, code, signOutEverywhere }) => {
          await twoFactorApi.disable({ password, code, sign_out_everywhere: signOutEverywhere });
          await refreshUser();
          await loadStatus();
          setDisableOpen(false);
          showToast({ title: "Verificación en dos pasos desactivada", variant: "success" });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Re-auth dialog (shared by regenerate + disable). Requires password + a TOTP
// or recovery code; disable additionally offers "sign out everywhere".
// ---------------------------------------------------------------------------

interface ReAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  withSignOut?: boolean;
  onConfirm: (v: { password: string; code: string; signOutEverywhere: boolean }) => Promise<void>;
}

function ReAuthDialog({ open, onOpenChange, title, confirmLabel, withSignOut, onConfirm }: ReAuthDialogProps) {
  const { handleError } = useApiErrorHandler();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [signOut, setSignOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPassword("");
    setCode("");
    setSignOut(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password || !code.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await onConfirm({ password, code: code.trim(), signOutEverywhere: signOut });
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.hasFieldCode("password", "invalid")) {
        setError("La contraseña es incorrecta.");
      } else if (err instanceof ApiError && err.hasFieldCode("code", "invalid_code")) {
        setError("El código no es válido.");
      } else {
        handleError(err);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={title}
    >
      <form className="space-y-4" noValidate onSubmit={submit}>
        <p className="text-sm text-muted-foreground">
          Confirma con tu contraseña y un código de tu aplicación (o un código de
          recuperación).
        </p>
        <div className="space-y-1.5" data-field="password">
          <Label htmlFor="reauth_password">Contraseña actual</Label>
          <PasswordInput
            id="reauth_password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5" data-field="code">
          <Label htmlFor="reauth_code">Código (6 dígitos o de recuperación)</Label>
          <Input
            id="reauth_code"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {withSignOut ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={signOut} onCheckedChange={(v) => setSignOut(v === true)} />
            Cerrar sesión en todos los dispositivos
          </label>
        ) : null}
        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={busy || !password || !code.trim()}>
            {busy ? "Procesando..." : confirmLabel}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
