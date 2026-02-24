import { useMemo, useState } from "react";
import { useFilterStore } from "@/store/filterStore";
import { getFilterStatus } from "@/types/filter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const statusDotColor: Record<string, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  urgent: "bg-urgent",
  expired: "bg-destructive",
};

export function FilterCalendar() {
  const { filters } = useFilterStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDay = getDay(days[0]); // 0=Sun
  const adjustedStart = startDay === 0 ? 6 : startDay - 1; // Mon=0

  const expirationsByDay = useMemo(() => {
    const map = new Map<string, { status: string; count: number }[]>();
    filters.forEach((f) => {
      const key = format(f.expirationDate, "yyyy-MM-dd");
      const status = getFilterStatus(f.expirationDate);
      const arr = map.get(key) || [];
      arr.push({ status, count: 1 });
      map.set(key, arr);
    });
    return map;
  }, [filters]);

  const today = new Date();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Calendario
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px">
          {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1.5">
              {d}
            </div>
          ))}

          {Array.from({ length: adjustedStart }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const events = expirationsByDay.get(key);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1.5 rounded-md text-xs transition-colors",
                  isToday && "bg-primary/10 font-bold text-primary",
                  !isSameMonth(day, currentMonth) && "text-muted-foreground/30"
                )}
              >
                <span>{format(day, "d")}</span>
                {events && (
                  <div className="flex gap-0.5 mt-0.5">
                    {events.map((e, i) => (
                      <span key={i} className={cn("w-1.5 h-1.5 rounded-full", statusDotColor[e.status])} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
          {[
            { color: "bg-success", label: "Vigente" },
            { color: "bg-warning", label: "30 días" },
            { color: "bg-urgent", label: "15 días" },
            { color: "bg-destructive", label: "Caducado" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", color)} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
