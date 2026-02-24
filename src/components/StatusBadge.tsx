import { FilterStatus } from "@/types/filter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<FilterStatus, { label: string; className: string }> = {
  ok: { label: "Vigente", className: "bg-success text-success-foreground" },
  warning: { label: "Próx. 30 días", className: "bg-warning text-warning-foreground" },
  urgent: { label: "Próx. 15 días", className: "bg-urgent text-urgent-foreground animate-pulse-warning" },
  expired: { label: "Caducado", className: "bg-destructive text-destructive-foreground" },
};

export function StatusBadge({ status }: { status: FilterStatus }) {
  const config = statusConfig[status];
  return (
    <Badge className={cn("font-mono text-xs font-semibold tracking-wide border-0", config.className)}>
      {config.label}
    </Badge>
  );
}
