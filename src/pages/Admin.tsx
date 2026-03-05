import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, Pencil, UserX, Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  role: "admin" | "editor" | null;
}

const Admin = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("editor");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, created_at");

    if (!profiles) { setLoading(false); return; }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) ?? []);

    setUsers(
      profiles.map(p => ({
        ...p,
        role: (roleMap.get(p.user_id) as "admin" | "editor") ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && userRole !== "admin") {
      navigate("/");
      return;
    }
    if (!loading && userRole === "admin") {
      fetchUsers();
    }
  }, [userRole, loading, navigate, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }

    if (newRole === "none") {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as "admin" | "editor" });
      if (error) { toast.error(error.message); return; }
    }

    toast.success("Rol actualizado");
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCreating(true);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: newEmail.trim(), password: newPassword, role: newRole },
      });

      if (res.error) {
        toast.error("Error al crear usuario: " + res.error.message);
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success("Usuario creado con rol " + newRole);
        setNewEmail("");
        setNewPassword("");
        setNewRole("editor");
        fetchUsers();
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
    setCreating(false);
  };

  if (loading || userRole !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Panel de Administración</h1>
            <p className="text-xs text-muted-foreground">Gestión de usuarios y roles</p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Create user card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Crear Nuevo Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contraseña *</Label>
                <Input
                  type="password"
                  placeholder="Mín. 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rol</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating} className="h-9">
                <UserPlus className="w-4 h-4 mr-1.5" />
                {creating ? "Creando..." : "Crear"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuarios Registrados ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {u.role === "admin" ? (
                          <Shield className="w-4 h-4 text-primary" />
                        ) : u.role === "editor" ? (
                          <Pencil className="w-4 h-4 text-primary" />
                        ) : (
                          <UserX className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.email ?? "Sin email"}</p>
                        <p className="text-xs text-muted-foreground">
                          Registrado: {new Date(u.created_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.user_id === user?.id ? (
                        <Badge variant="outline" className="text-xs">Tú (Admin)</Badge>
                      ) : (
                        <Select
                          value={u.role ?? "none"}
                          onValueChange={(val) => handleRoleChange(u.user_id, val)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="none">Sin rol</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
