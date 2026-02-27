import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FILTER_TYPES, FilterType } from "@/types/filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

const MONTH_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface EditFilterDialogProps {
  filter: Tables<"filters"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditFilterDialog({ filter, open, onOpenChange, onSaved }: EditFilterDialogProps) {
  const [location, setLocation] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [filterType, setFilterType] = useState<FilterType | "">("");
  const [expirationMonths, setExpirationMonths] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (filter) {
      setLocation(filter.location);
      setInstallationDate(filter.installation_date);
      setFilterType(filter.filter_type as FilterType);
      setExpirationMonths(filter.expiration_months.toString());
      setNotes(filter.notes ?? "");
    }
  }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filter) return;

    if (!location.trim() || !installationDate || !filterType || !expirationMonths) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    const months = parseInt(expirationMonths);
    const installDate = new Date(installationDate);
    const expirationDate = addMonths(installDate, months);

    setLoading(true);
    const { error } = await supabase
      .from("filters")
      .update({
        location: location.trim(),
        installation_date: installationDate,
        filter_type: filterType,
        expiration_months: months,
        expiration_date: format(expirationDate, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      })
      .eq("id", filter.id);
    setLoading(false);

    if (error) {
      toast.error("Error al actualizar: " + error.message);
    } else {
      toast.success("Filtro actualizado correctamente");
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Editar Filtro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-location" className="text-xs font-medium">Ubicación *</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-filterType" className="text-xs font-medium">Tipo de Filtro *</Label>
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
            <Label htmlFor="edit-installDate" className="text-xs font-medium">Fecha Instalación *</Label>
            <Input
              id="edit-installDate"
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-expMonths" className="text-xs font-medium">Caducidad (meses) *</Label>
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
            <Label htmlFor="edit-notes" className="text-xs font-medium">Notas</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
