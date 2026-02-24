import { getFilterStatus } from "@/types/filter";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, AlertTriangle, Clock, XCircle } from "lucide-react";
import { useMemo } from "react";
import { Tables } from "@/integrations/supabase/types";

interface StatsBarProps {
  filters: Tables<"filters">[];
}

export function StatsBar({ filters }: StatsBarProps) {
  const stats = useMemo(() => {
    const counts = { total: filters.length, ok: 0, warning: 0, urgent: 0, expired: 0 };
    filters.forEach((f) => {
      const s = getFilterStatus(new Date(f.expiration_date));
      counts[s]++;
    });
    return counts;
  }, [filters]);

  const items = [
    { label: "Total", value: stats.total, icon: Filter, className: "text-primary" },
    { label: "Vigentes", value: stats.ok, icon: Clock, className: "text-success" },
    { label: "Próximos", value: stats.warning + stats.urgent, icon: AlertTriangle, className: "text-warning" },
    { label: "Caducados", value: stats.expired, icon: XCircle, className: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, className }) => (
        <Card key={label} className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${className}`} />
            <div>
              <p className="text-2xl font-bold font-mono">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
