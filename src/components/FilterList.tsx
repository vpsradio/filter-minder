import { useState } from "react";
import { getFilterStatus, getDaysUntilExpiration } from "@/types/filter";
import { StatusBadge } from "./StatusBadge";
import { EditFilterDialog } from "./EditFilterDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Calendar, Trash2, Filter, Pencil, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { exportToPDF, exportToCSV } from "@/lib/exportFilters";

interface FilterListProps {
  filters: Tables<"filters">[];
  onDeleted: () => void;
}

export function FilterList({ filters, onDeleted }: FilterListProps) {
  const { userRole, user } = useAuth();
  const [editingFilter, setEditingFilter] = useState<Tables<"filters"> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sorted = [...filters].sort(
    (a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
  );

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((f) => f.id)));
    }
  };

  const getExportFilters = () => {
    if (selectedIds.size > 0) {
      return sorted.filter((f) => selectedIds.has(f.id));
    }
    return sorted;
  };

  const handleExportPDF = () => {
    const data = getExportFilters();
    if (data.length === 0) {
      toast.error("No hay filtros para exportar");
      return;
    }
    exportToPDF(data);
    toast.success(`PDF generado con ${data.length} filtro(s)`);
  };

  const handleExportCSV = () => {
    const data = getExportFilters();
    if (data.length === 0) {
      toast.error("No hay filtros para exportar");
      return;
    }
    exportToCSV(data);
    toast.success(`CSV generado con ${data.length} filtro(s)`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("filters").delete().eq("id", id);
    if (error) {
      console.error("Error deleting filter:", error);
      toast.error("No se pudo eliminar el filtro. Inténtalo de nuevo.");
    } else {
      toast.success("Filtro eliminado");
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      onDeleted();
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Filter className="w-12 h-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">No hay filtros registrados</p>
        <p className="text-sm">Añade tu primer filtro usando el formulario</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Seleccionar todos"
          />
          <span className="text-xs text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} seleccionado(s)`
              : "Seleccionar todos"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8 text-xs gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {sorted.map((filter, i) => {
        const expDate = new Date(filter.expiration_date);
        const status = getFilterStatus(expDate);
        const daysLeft = getDaysUntilExpiration(expDate);
        const canDelete = userRole === "admin" || filter.user_id === user?.id;
        const isSelected = selectedIds.has(filter.id);

        return (
          <Card
            key={filter.id}
            className={`glass-card animate-fade-in overflow-hidden transition-colors ${isSelected ? "ring-1 ring-primary/40 bg-primary/5" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(filter.id)}
                  className="mt-1"
                  aria-label={`Seleccionar ${filter.location}`}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {filter.filter_type}
                    </span>
                    <StatusBadge status={status} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {filter.expiration_months} meses
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{filter.location}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Instalado: {format(new Date(filter.installation_date), "dd MMM yyyy", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Caduca: {format(expDate, "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>

                  {filter.notes && (
                    <p className="text-xs text-muted-foreground italic">{filter.notes}</p>
                  )}

                  <p className="text-xs font-mono font-semibold">
                    {daysLeft > 0 ? (
                      <span className={status === "ok" ? "text-success" : status === "warning" ? "text-warning" : "text-urgent"}>
                        {daysLeft} días restantes
                      </span>
                    ) : (
                      <span className="text-destructive">Caducado hace {Math.abs(daysLeft)} días</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-1 flex-shrink-0">
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary h-7 w-7"
                      onClick={() => setEditingFilter(filter)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-7 w-7"
                      onClick={() => handleDelete(filter.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <EditFilterDialog
        filter={editingFilter}
        open={!!editingFilter}
        onOpenChange={(open) => { if (!open) setEditingFilter(null); }}
        onSaved={onDeleted}
      />
    </div>
  );
}
