import { useState } from "react";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { authApi } from "@/features/auth/api/authApi";
import { ApiError } from "@/types/api";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

interface Props {
  challengeToken: string;
  /** Methods offered by the backend (e.g. ["totp","recovery"]). */
  methods: string[];
  /** Called after a successful verification (session established). */
  onVerified: () => void;
  /** Called when the challenge token is expired/invalid (401) — restart login. */
  onExpired: () => void;
}

function OtpSlot({ char, isActive }: SlotProps) {
  return (
    <div
      className={[
        "flex h-12 w-10 items-center justify-center rounded-md border text-lg font-semibold",
        isActive ? "border-primary ring-2 ring-primary/30" : "border-input",
      ].join(" ")}
    >
      {char ?? ""}
    </div>
  );
}

/**
 * Second-factor challenge step shown inside Login after a `2fa_required`
 * response (2fa-contract §5). Offers a 6-digit TOTP entry, a toggle to a
 * recovery code, and a "remember this device" checkbox. All copy is Spanish;
 * a throttled (429) response surfaces the Retry-After seconds.
 */
export default function TwoFactorChallenge({
  challengeToken,
  methods,
  onVerified,
  onExpired,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const allowsRecovery = methods.includes("recovery");

  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = async (value: string) => {
    setFieldError(null);
    setSubmitting(true);
    try {
      await authApi.verifyTwoFactor({
        challengeToken,
        code: value.trim(),
        rememberDevice: remember,
      });
      onVerified();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isThrottled) {
          const secs = err.retryAfter;
          setFieldError(
            secs
              ? `Demasiados intentos. Inténtalo de nuevo en ${secs} segundos.`
              : "Demasiados intentos. Inténtalo de nuevo más tarde.",
          );
          return;
        }
        if (err.status === 401) {
          // Challenge expired/invalid — caller restarts the login flow.
          handleError(err);
          onExpired();
          return;
        }
        if (err.hasFieldCode("code", "invalid_code")) {
          setFieldError("El código no es válido. Verifícalo e inténtalo de nuevo.");
          setCode("");
          return;
        }
      }
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !code.trim()) return;
    void submit(code);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Verificación en dos pasos
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
          Confirma tu identidad
        </h2>
        <p className="mt-2 text-sm text-muted">
          {useRecovery
            ? "Ingresa uno de tus códigos de recuperación."
            : "Ingresa el código de 6 dígitos de tu aplicación de autenticación."}
        </p>
      </header>

      <form className="space-y-5" noValidate onSubmit={onSubmitForm}>
        {useRecovery ? (
          <div className="space-y-1.5" data-field="code">
            <Label htmlFor="recovery_code">Código de recuperación</Label>
            <Input
              id="recovery_code"
              name="recovery_code"
              autoComplete="one-time-code"
              placeholder="XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {fieldError ? <FieldErrorText>{fieldError}</FieldErrorText> : null}
          </div>
        ) : (
          <div className="space-y-2" data-field="code">
            <Label htmlFor="totp_code">Código</Label>
            <OTPInput
              id="totp_code"
              maxLength={6}
              value={code}
              onChange={(value) => {
                setCode(value);
                setFieldError(null);
                if (value.length === 6 && !submitting) void submit(value);
              }}
              pattern={REGEXP_ONLY_DIGITS}
              containerClassName="flex items-center gap-2"
              render={({ slots }) => (
                <div className="flex gap-2">
                  {slots.map((slot, idx) => (
                    <OtpSlot key={idx} {...slot} />
                  ))}
                </div>
              )}
            />
            {fieldError ? <FieldErrorText>{fieldError}</FieldErrorText> : null}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-muted">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
          />
          Recordar este dispositivo por 30 días
        </label>

        <Button type="submit" disabled={submitting || !code.trim()} className="w-full" size="lg">
          {submitting ? "Verificando..." : "Verificar"}
        </Button>
      </form>

      {allowsRecovery ? (
        <button
          type="button"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode("");
            setFieldError(null);
          }}
        >
          {useRecovery
            ? "Usar el código de la aplicación"
            : "¿No tienes acceso? Usa un código de recuperación"}
        </button>
      ) : null}
    </div>
  );
}
