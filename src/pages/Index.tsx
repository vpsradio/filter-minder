import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AddFilterForm } from "@/components/AddFilterForm";
import { FilterCalendar } from "@/components/FilterCalendar";
import { FilterList } from "@/components/FilterList";
import { StatsBar } from "@/components/StatsBar";
import { LoginPage } from "@/components/LoginPage";
import { Filter, LogOut, Shield, Pencil, Users } from "lucide-react";
import { ImportExcelDialog } from "@/components/ImportExcelDialog";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";

const Index = () => {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Tables<"filters">[]>([]);

  const fetchFilters = useCallback(async () => {
    const { data } = await supabase
      .from("filters")
      .select("*")
      .order("expiration_date", { ascending: true });
    setFilters(data ?? []);
  }, []);

  useEffect(() => {
    if (user) fetchFilters();
  }, [user, fetchFilters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const roleIcon = userRole === "admin" ? Shield : Pencil;
  const roleLabel = userRole === "admin" ? "Administrador" : userRole === "editor" ? "Editor" : "Sin rol";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">FilterControl</h1>
              <p className="text-xs text-muted-foreground">Gestión y seguimiento de filtros</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {(() => { const Icon = roleIcon; return <Icon className="w-3.5 h-3.5" />; })()}
              <span>{roleLabel}</span>
            </div>
            {userRole === "admin" && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="h-8 text-xs gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Admin
              </Button>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <StatsBar filters={filters} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <FilterCalendar filters={filters} />
            <AddFilterForm onAdded={fetchFilters} />
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Filtros Registrados</h2>
              <span className="text-xs text-muted-foreground font-mono">
                Ordenados por caducidad
              </span>
            </div>
            <FilterList filters={filters} onDeleted={fetchFilters} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
