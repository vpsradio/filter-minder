import { useState } from "react";
import { useFilterStore } from "@/store/filterStore";
import { FILTER_TYPES, FilterType } from "@/types/filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddFilterForm() {
  const { addFilter } = useFilterStore();
  const [location, setLocation] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [filterType, setFilterType] = useState<FilterType | "">("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!location.trim() || !installationDate || !filterType || !expirationDate) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    const install = new Date(installationDate);
    const expiry = new Date(expirationDate);

    if (expiry <= install) {
      toast.error("La fecha de caducidad debe ser posterior a la de instalación");
      return;
    }

    addFilter({
      id: crypto.randomUUID(),
      location: location.trim(),
      installationDate: install,
      filterType: filterType as FilterType,
      expirationDate: expiry,
      notes: notes.trim() || undefined,
    });

    setLocation("");
    setInstallationDate("");
    setFilterType("");
    setExpirationDate("");
    setNotes("");

    toast.success("Filtro añadido correctamente");
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

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="expDate" className="text-xs font-medium">Fecha Caducidad *</Label>
              <Input
                id="expDate"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
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

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Añadir Filtro
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
