import { useFilterStore } from "@/store/filterStore";
import { getFilterStatus, getDaysUntilExpiration } from "@/types/filter";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Calendar, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FilterList() {
  const { filters, removeFilter } = useFilterStore();

  const sorted = [...filters].sort(
    (a, b) => a.expirationDate.getTime() - b.expirationDate.getTime()
  );

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
        const status = getFilterStatus(filter.expirationDate);
        const daysLeft = getDaysUntilExpiration(filter.expirationDate);

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
                      {filter.filterType}
                    </span>
                    <StatusBadge status={status} />
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{filter.location}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Instalado: {format(filter.installationDate, "dd MMM yyyy", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Caduca: {format(filter.expirationDate, "dd MMM yyyy", { locale: es })}
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

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeFilter(filter.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
