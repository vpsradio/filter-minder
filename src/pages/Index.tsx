import { AddFilterForm } from "@/components/AddFilterForm";
import { FilterCalendar } from "@/components/FilterCalendar";
import { FilterList } from "@/components/FilterList";
import { StatsBar } from "@/components/StatsBar";
import { Filter } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Filter className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">FilterControl</h1>
            <p className="text-xs text-muted-foreground">Gestión y seguimiento de filtros</p>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <StatsBar />

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Calendar + Form */}
          <div className="space-y-6">
            <FilterCalendar />
            <AddFilterForm />
          </div>

          {/* Right: Filter list */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Filtros Registrados</h2>
              <span className="text-xs text-muted-foreground font-mono">
                Ordenados por caducidad
              </span>
            </div>
            <FilterList />
          </div>
        </div>

        {/* Cloud notice */}
        <div className="text-center py-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 Para activar notificaciones por correo y persistencia de datos, conecta Lovable Cloud
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
