import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { addMonths, format, parse, isValid } from "date-fns";
import * as XLSX from "xlsx";

interface ParsedRow {
  location: string;
  filter_type: string;
  installation_date: string;
  expiration_months: number;
  notes: string | null;
  valid: boolean;
  error?: string;
}

interface ImportExcelDialogProps {
  onImported: () => void;
}

const VALID_FILTER_TYPES = ["Claris 250", "Claris 500", "Claris 1000", "Claris 1500", "Claris 2000", "Brita"];

function parseDate(value: unknown): string | null {
  if (!value) return null;

  // Excel serial date number
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const d = new Date(date.y, date.m - 1, date.d);
      if (isValid(d)) return format(d, "yyyy-MM-dd");
    }
    return null;
  }

  const str = String(value).trim();

  // Try common formats
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "MM/dd/yyyy", "d/M/yyyy"];
  for (const fmt of formats) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() > 2000) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  // Fallback to native parsing
  const native = new Date(str);
  if (isValid(native) && native.getFullYear() > 2000) {
    return format(native, "yyyy-MM-dd");
  }

  return null;
}

function normalizeHeaders(row: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    ubicación: "location", ubicacion: "location", location: "location",
    tipo: "filter_type", "tipo de filtro": "filter_type", "tipo filtro": "filter_type", filter_type: "filter_type", type: "filter_type",
    "fecha instalación": "installation_date", "fecha instalacion": "installation_date", instalación: "installation_date", instalacion: "installation_date", installation_date: "installation_date", "fecha": "installation_date", date: "installation_date",
    meses: "expiration_months", "caducidad meses": "expiration_months", "caducidad (meses)": "expiration_months", caducidad: "expiration_months", expiration_months: "expiration_months", months: "expiration_months",
    notas: "notes", notes: "notes", observaciones: "notes",
  };

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const normalized = key.toLowerCase().trim();
    const mapped = map[normalized];
    if (mapped) result[mapped] = val;
  }
  return result;
}

function parseRow(raw: Record<string, unknown>): ParsedRow {
  const row = normalizeHeaders(raw);

  const location = String(row.location || "").trim();
  const filterType = String(row.filter_type || "").trim();
  const installDate = parseDate(row.installation_date);
  const months = parseInt(String(row.expiration_months || ""), 10);
  const notes = row.notes ? String(row.notes).trim() : null;

  const errors: string[] = [];
  if (!location) errors.push("Ubicación vacía");
  if (!VALID_FILTER_TYPES.includes(filterType)) errors.push(`Tipo "${filterType}" no válido`);
  if (!installDate) errors.push("Fecha inválida");
  if (isNaN(months) || months < 3 || months > 12) errors.push("Meses debe ser 3-12");

  return {
    location,
    filter_type: filterType,
    installation_date: installDate || "",
    expiration_months: isNaN(months) ? 0 : months,
    notes,
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join(", ") : undefined,
  };
}

export function ImportExcelDialog({ onImported }: ImportExcelDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    if (jsonData.length === 0) {
      toast.error("El archivo está vacío");
      return;
    }

    setRows(jsonData.map(parseRow));
  };

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  const handleImport = async () => {
    if (!user || validRows.length === 0) return;
    setImporting(true);

    const records = validRows.map((r) => {
      const expDate = addMonths(new Date(r.installation_date), r.expiration_months);
      return {
        user_id: user.id,
        location: r.location,
        filter_type: r.filter_type,
        installation_date: r.installation_date,
        expiration_months: r.expiration_months,
        expiration_date: format(expDate, "yyyy-MM-dd"),
        notes: r.notes,
      };
    });

    const { error } = await supabase.from("filters").insert(records);
    setImporting(false);

    if (error) {
      console.error("Error importing filters:", error);
      toast.error("No se pudieron importar los filtros. Revisa el archivo e inténtalo de nuevo.");
    } else {
      toast.success(`${records.length} filtro(s) importados correctamente`);
      setRows([]);
      setFileName("");
      setOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      onImported();
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRows([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar filtros desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>El archivo debe tener estas columnas:</p>
            <p className="font-mono bg-muted px-2 py-1 rounded">
              Ubicación | Tipo | Fecha Instalación | Meses | Notas
            </p>
            <p>Tipos válidos: {VALID_FILTER_TYPES.join(", ")}</p>
            <p>Meses: entre 3 y 12</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
            {fileName && <span className="text-xs text-muted-foreground truncate">{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-3.5 h-3.5" /> {validRows.length} válido(s)
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="w-3.5 h-3.5" /> {invalidRows.length} con errores
                  </span>
                )}
              </div>

              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">Ubicación</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Meses</TableHead>
                      <TableHead className="text-xs">Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className={row.valid ? "" : "bg-destructive/5"}>
                        <TableCell className="text-xs">
                          {row.valid ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <span className="text-destructive text-[10px]" title={row.error}>
                              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                              {row.error}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.location}</TableCell>
                        <TableCell className="text-xs">{row.filter_type}</TableCell>
                        <TableCell className="text-xs">{row.installation_date}</TableCell>
                        <TableCell className="text-xs">{row.expiration_months}</TableCell>
                        <TableCell className="text-xs">{row.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? "Importando..." : `Importar ${validRows.length} filtro(s)`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
