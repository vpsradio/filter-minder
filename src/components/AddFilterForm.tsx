import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FILTER_TYPES, FilterType } from "@/types/filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";

const MONTH_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface AddFilterFormProps {
  onAdded: () => void;
}

export function AddFilterForm({ onAdded }: AddFilterFormProps) {
  const { user } = useAuth();
  const [location, setLocation] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [filterType, setFilterType] = useState<FilterType | "">("");
  const [expirationMonths, setExpirationMonths] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!location.trim() || !installationDate || !filterType || !expirationMonths) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    const months = parseInt(expirationMonths);
    const installDate = new Date(installationDate);
    const expirationDate = addMonths(installDate, months);

    setLoading(true);
    const { error } = await supabase.from("filters").insert({
      user_id: user.id,
      location: location.trim(),
      installation_date: installationDate,
      filter_type: filterType,
      expiration_months: months,
      expiration_date: format(expirationDate, "yyyy-MM-dd"),
      notes: notes.trim() || null,
    });
    setLoading(false);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      setLocation("");
      setInstallationDate("");
      setFilterType("");
      setExpirationMonths("");
      setNotes("");
      toast.success("Filtro añadido correctamente");
      onAdded();
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Filtro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-medium">Ubicación *</Label>
            <Input
              id="location"
              placeholder="Ej: Oficina Central - Planta 2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filterType" className="text-xs font-medium">Tipo de Filtro *</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="installDate" className="text-xs font-medium">Fecha Instalación *</Label>
            <Input
              id="installDate"
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expMonths" className="text-xs font-medium">Caducidad (meses) *</Label>
            <Select value={expirationMonths} onValueChange={setExpirationMonths}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar meses" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m.toString()}>{m} meses</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {installationDate && expirationMonths && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Caduca: {format(addMonths(new Date(installationDate), parseInt(expirationMonths)), "dd/MM/yyyy")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            {loading ? "Guardando..." : "Añadir Filtro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
