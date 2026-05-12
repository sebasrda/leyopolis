"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Copy, Check, AlertTriangle } from "lucide-react";

export default function SecurityPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const required = role === "ADMIN" || role === "SUPERADMIN";

  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrDataUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/2fa/status").then((r) => (r.ok ? r.json() : null)).then((d) => d && setStatus(d));
  }, []);

  const startSetup = async () => {
    setError(null);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Error al iniciar configuración");
      return;
    }
    setSetupData(data);
  };

  const confirmSetup = async () => {
    setError(null);
    const res = await fetch("/api/auth/2fa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: verifyToken.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Código inválido");
      return;
    }
    setSuccess("¡2FA activado correctamente!");
    setSetupData(null);
    setVerifyToken("");
    setStatus({ enabled: true });
  };

  const disable2FA = async () => {
    setError(null);
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: disableToken.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Error");
      return;
    }
    setSuccess("2FA desactivado.");
    setStatus({ enabled: false });
    setDisableToken("");
  };

  const copyRecovery = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-indigo-400" /> Seguridad de la cuenta
        </h1>
        <p className="text-muted-foreground mt-1">Protege tu cuenta con autenticación de dos factores (2FA).</p>
      </div>

      {required && !status?.enabled && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-300">2FA es obligatorio para tu rol</p>
            <p className="text-amber-200/80 mt-1">
              Como {role}, debes activar 2FA para proteger acciones críticas (gestión de usuarios, licencias, instituciones).
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm p-3 flex items-center gap-2">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Autenticación de dos factores
                {status?.enabled ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Activo</Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">Inactivo</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Añade una segunda capa de seguridad usando una app como Google Authenticator, Authy o 1Password.
              </CardDescription>
            </div>
            {status?.enabled ? <ShieldCheck className="h-10 w-10 text-emerald-400" /> : <ShieldAlert className="h-10 w-10 text-muted-foreground" />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── NOT enabled and not enrolling ───────────────────────── */}
          {!status?.enabled && !setupData && (
            <Button onClick={startSetup} className="bg-indigo-600 hover:bg-indigo-700">
              Activar 2FA
            </Button>
          )}

          {/* ── Enrolling: show QR + recovery codes ─────────────────── */}
          {setupData && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <p className="font-semibold text-sm">1. Escanea este código QR con tu app de autenticación</p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <img src={setupData.qrDataUrl} alt="QR 2FA" className="rounded-lg bg-white p-2" width={180} height={180} />
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>Si no puedes escanear, ingresa este secreto manualmente:</p>
                    <code className="block bg-card/50 rounded p-2 font-mono break-all">{setupData.secret}</code>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4">
                <p className="font-bold text-amber-300 text-sm mb-2">⚠ 2. Guarda estos códigos de recuperación</p>
                <p className="text-xs text-amber-200/80 mb-3">
                  Cada uno se usa UNA SOLA VEZ. Te servirán si pierdes el celular. <strong>NO los compartas con nadie.</strong>
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-card/30 rounded p-3">
                  {setupData.recoveryCodes.map((c) => (
                    <code key={c} className="text-amber-300">{c}</code>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={copyRecovery} className="mt-3 gap-2">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copiado" : "Copiar todos"}
                </Button>
              </div>

              <div className="rounded-lg bg-muted/30 p-4">
                <p className="font-semibold text-sm mb-2">3. Verifica el código de 6 dígitos</p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-lg tracking-widest"
                  />
                  <Button onClick={confirmSetup} disabled={verifyToken.length !== 6} className="bg-indigo-600 hover:bg-indigo-700">
                    Activar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Already enabled: option to disable ──────────────────── */}
          {status?.enabled && !setupData && !required && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Si quieres desactivar 2FA, ingresa un código actual de tu app:</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código de 6 dígitos o recuperación"
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value)}
                />
                <Button variant="destructive" onClick={disable2FA} disabled={!disableToken}>
                  Desactivar
                </Button>
              </div>
            </div>
          )}

          {status?.enabled && required && (
            <p className="text-sm text-muted-foreground">
              No puedes desactivar 2FA porque tu rol ({role}) lo requiere. Solo un superadmin puede hacerlo en tu nombre.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
