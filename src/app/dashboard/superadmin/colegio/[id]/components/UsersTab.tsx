"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, KeyRound, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

// ─── CSV Template download helper ─────────────────────────────────────────────
function downloadCsvTemplate() {
  const header = "name,email,password,grade,licenseType";
  const sample = [
    "Ana García,ana.garcia@ejemplo.com,,6to,ANUAL",
    "Luis Pérez,luis.perez@ejemplo.com,clave123,7mo,MENSUAL",
    "María Rodríguez,maria.r@ejemplo.com,,8vo,ANUAL",
  ].join("\n");
  const blob = new Blob([`${header}\n${sample}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_estudiantes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type BulkResult = { email: string; name: string; password: string; status: "created" | "skipped"; reason?: string };

export default function UsersTab({
  institutionId,
  role,
  limits,
  onUpdate,
}: {
  institutionId: string;
  role: string;
  limits: { count: number; max: number };
  onUpdate: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // single-create
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [licenseType, setLicenseType] = useState("ANUAL");
  const [creating, setCreating] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; pass: string } | null>(null);

  // bulk upload
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{ created: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, [institutionId, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users?role=${role}`);
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, licenseType }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCredentials({ email: data.user.email, pass: data.plainPassword });
        fetchUsers();
        onUpdate();
        setName("");
        setEmail("");
      } else {
        alert(data.message || "Error al crear");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario permanentemente?")) return;
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== userId));
        onUpdate();
      } else {
        alert("Error al eliminar");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setUploading(true);
    setBulkResults(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users/bulk`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al procesar el archivo");
        return;
      }
      setBulkResults(data.results as BulkResult[]);
      setBulkSummary({ created: data.created, total: data.total });
      fetchUsers();
      onUpdate();
    } catch (e) {
      console.error(e);
      alert("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  // Download results as CSV
  const downloadResults = () => {
    if (!bulkResults) return;
    const header = "nombre,email,contraseña,estado,motivo";
    const rows = bulkResults.map((r) =>
      `"${r.name}","${r.email}","${r.password}","${r.status === "created" ? "Creado" : "Omitido"}","${r.reason || ""}"`
    );
    const blob = new Blob([`${header}\n${rows.join("\n")}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultado_carga_estudiantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const roleName = role === "STUDENT" ? "Estudiantes" : role === "TEACHER" ? "Docentes" : role === "COORDINATOR" ? "Coordinadores" : "Administradores";
  const roleSingular = role === "STUDENT" ? "Estudiante" : role === "TEACHER" ? "Docente" : role === "COORDINATOR" ? "Coordinador" : "Administrador";
  const isStudent = role === "STUDENT";
  const atLimit = isStudent && limits.max > 0 && limits.count >= limits.max;

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Gestión de {roleName}</h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* ── Bulk Upload button (students only) ── */}
            {isStudent && (
              <Dialog open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) { setBulkFile(null); setBulkResults(null); setBulkSummary(null); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                    <FileSpreadsheet className="h-4 w-4" /> Carga Masiva Excel/CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-500" /> Carga Masiva de Estudiantes
                    </DialogTitle>
                  </DialogHeader>

                  {bulkResults ? (
                    /* ── Results view ── */
                    <div className="space-y-4 py-2">
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-800">Proceso completado</p>
                          <p className="text-sm text-emerald-700">
                            {bulkSummary?.created} estudiantes creados de {bulkSummary?.total} filas procesadas.
                          </p>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left font-medium">Nombre</th>
                              <th className="p-2 text-left font-medium">Email</th>
                              <th className="p-2 text-left font-medium">Contraseña</th>
                              <th className="p-2 text-center font-medium">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bulkResults.map((r, i) => (
                              <tr key={i} className={r.status === "skipped" ? "bg-red-50" : ""}>
                                <td className="p-2">{r.name}</td>
                                <td className="p-2 font-mono">{r.email}</td>
                                <td className="p-2 font-mono text-indigo-600">{r.password || "—"}</td>
                                <td className="p-2 text-center">
                                  {r.status === "created" ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold"><CheckCircle2 className="h-3 w-3" /> Creado</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold" title={r.reason}><AlertCircle className="h-3 w-3" /> {r.reason || "Omitido"}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button onClick={downloadResults} variant="outline" className="gap-2 flex-1">
                          <Download className="h-4 w-4" /> Descargar resultados CSV
                        </Button>
                        <Button onClick={() => setBulkOpen(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Upload form ── */
                    <div className="space-y-5 py-2">
                      {/* Instructions */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                        <p className="font-bold">Formato del archivo CSV/Excel:</p>
                        <p>Columnas: <code className="bg-blue-100 px-1 rounded">name, email, password, grade, licenseType</code></p>
                        <ul className="list-disc list-inside text-xs mt-2 space-y-0.5 text-blue-700">
                          <li><strong>email</strong> — Obligatorio. Correo del estudiante.</li>
                          <li><strong>name</strong> — Nombre completo (opcional, usa parte del email si falta).</li>
                          <li><strong>password</strong> — Si se omite, se genera automáticamente.</li>
                          <li><strong>grade</strong> — Grado/curso (opcional).</li>
                          <li><strong>licenseType</strong> — MENSUAL, TRIMESTRAL, ANUAL (default: ANUAL).</li>
                        </ul>
                      </div>

                      {/* Download template */}
                      <Button variant="outline" onClick={downloadCsvTemplate} className="w-full gap-2 border-dashed">
                        <Download className="h-4 w-4" /> Descargar plantilla CSV de ejemplo
                      </Button>

                      {/* File input */}
                      <div className="space-y-2">
                        <Label>Seleccionar archivo CSV</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${bulkFile ? "border-emerald-400 bg-emerald-50" : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50"}`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {bulkFile ? (
                            <div className="flex items-center justify-center gap-3">
                              <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                              <div className="text-left">
                                <p className="font-medium text-emerald-700">{bulkFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(bulkFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <button className="ml-2 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setBulkFile(null); }}>
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="h-10 w-10 mx-auto text-gray-400" />
                              <p className="text-sm font-medium text-muted-foreground">Haz clic para seleccionar un archivo CSV</p>
                              <p className="text-xs text-gray-400">También puedes exportar un Excel como CSV y subirlo aquí</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      <Button
                        onClick={handleBulkUpload}
                        disabled={!bulkFile || uploading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      >
                        {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : <><Upload className="h-4 w-4" /> Subir y crear estudiantes</>}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}

            {/* ── Single create ── */}
            <Dialog open={createOpen} onOpenChange={(val) => { setCreateOpen(val); if (!val) setNewCredentials(null); }}>
              <DialogTrigger asChild>
                <Button disabled={atLimit} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                  <Plus className="h-4 w-4" /> Registrar {roleSingular}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo {roleSingular}</DialogTitle>
                </DialogHeader>

                {newCredentials ? (
                  <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center space-y-4">
                    <KeyRound className="h-10 w-10 text-green-600 mx-auto" />
                    <div>
                      <p className="text-sm text-green-800 font-medium">¡Creado exitosamente!</p>
                      <p className="text-xs text-muted-foreground mt-2">Copia estos datos y entrégalos al usuario:</p>
                    </div>
                    <div className="bg-card p-4 rounded border text-left space-y-2">
                      <p className="font-mono text-sm"><strong>Email:</strong> {newCredentials.email}</p>
                      <p className="font-mono text-sm text-indigo-400"><strong>Clave:</strong> {newCredentials.pass}</p>
                    </div>
                    <Button onClick={() => setCreateOpen(false)} className="w-full">Cerrar</Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo</Label>
                      <Input placeholder={`Nombre del ${roleSingular.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Licencia</Label>
                      <Select value={licenseType} onValueChange={setLicenseType}>
                        <SelectTrigger><SelectValue placeholder="Selecciona una licencia" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MENSUAL">Mensual (30 días)</SelectItem>
                          <SelectItem value="TRIMESTRAL">Trimestral (90 días)</SelectItem>
                          <SelectItem value="ANUAL">Anual (365 días)</SelectItem>
                          <SelectItem value="ACTIVATED">Permanente / Activa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreate} disabled={creating || !name || !email} className="w-full mt-2">
                      {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Crear (Clave Automática)
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {atLimit && (
          <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-sm">
            Has alcanzado el límite máximo de estudiantes contratados ({limits.max}). No puedes registrar más.
          </div>
        )}

        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="p-3 font-medium text-muted-foreground">Nombre</th>
                <th className="p-3 font-medium text-muted-foreground">Email</th>
                <th className="p-3 font-medium text-muted-foreground">Licencia</th>
                <th className="p-3 font-medium text-muted-foreground text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No hay {roleName.toLowerCase()} registrados.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted">
                    <td className="p-3 font-medium text-foreground">{u.name || "Sin nombre"}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                        {u.licenseType === "DEMO" ? "Demo" : u.licenseType === "MENSUAL" ? "Mensual" : u.licenseType === "TRIMESTRAL" ? "Trimestral" : u.licenseType === "ANUAL" ? "Anual" : "Permanente"}
                      </span>
                      {u.expiresAt && (
                        <span className="block text-xs text-gray-400 mt-1">Expira: {format(new Date(u.expiresAt), "dd/MM/yyyy")}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-700 hover:bg-red-50 h-8 w-8" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
