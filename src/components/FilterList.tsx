import { getFilterStatus, getDaysUntilExpiration } from "@/types/filter";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Calendar, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FilterListProps {
  filters: Tables<"filters">[];
  onDeleted: () => void;
}

export function FilterList({ filters, onDeleted }: FilterListProps) {
  const { userRole, user } = useAuth();

  const sorted = [...filters].sort(
    (a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("filters").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Filtro eliminado");
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
      {sorted.map((filter, i) => {
        const expDate = new Date(filter.expiration_date);
        const status = getFilterStatus(expDate);
        const daysLeft = getDaysUntilExpiration(expDate);
        const canDelete = userRole === "admin" || filter.user_id === user?.id;

        return (
          <Card
            key={filter.id}
            className="glass-card animate-fade-in overflow-hidden"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
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

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleDelete(filter.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
