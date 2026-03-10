import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";
import { getFilterStatus, getDaysUntilExpiration } from "@/types/filter";

type Filter = Tables<"filters">;

const statusLabel = (status: string) => {
  switch (status) {
    case "ok": return "Activo";
    case "warning": return "Próximo";
    case "urgent": return "Urgente";
    case "expired": return "Caducado";
    default: return status;
  }
};

export function exportToPDF(filters: Filter[]) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text("FilterControl — Informe de Filtros", 14, 20);
  doc.setFontSize(10);
  doc.text(`Generado: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: es })}`, 14, 28);
  doc.text(`Total filtros: ${filters.length}`, 14, 34);

  const rows = filters.map((f) => {
    const expDate = new Date(f.expiration_date);
    const status = getFilterStatus(expDate);
    const daysLeft = getDaysUntilExpiration(expDate);
    return [
      f.location,
      f.filter_type,
      format(new Date(f.installation_date), "dd/MM/yyyy"),
      format(expDate, "dd/MM/yyyy"),
      `${f.expiration_months} meses`,
      statusLabel(status),
      daysLeft > 0 ? `${daysLeft} días` : `Caducado (${Math.abs(daysLeft)}d)`,
      f.notes || "",
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [["Ubicación", "Tipo", "Instalación", "Caducidad", "Duración", "Estado", "Días rest.", "Notas"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [33, 60, 94] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`filtros_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
}

export function exportToCSV(filters: Filter[]) {
  const headers = ["Ubicación", "Tipo", "Fecha Instalación", "Fecha Caducidad", "Duración (meses)", "Estado", "Días Restantes", "Notas"];

  const rows = filters.map((f) => {
    const expDate = new Date(f.expiration_date);
    const status = getFilterStatus(expDate);
    const daysLeft = getDaysUntilExpiration(expDate);
    return [
      `"${f.location}"`,
      `"${f.filter_type}"`,
      format(new Date(f.installation_date), "dd/MM/yyyy"),
      format(expDate, "dd/MM/yyyy"),
      f.expiration_months.toString(),
      statusLabel(status),
      daysLeft.toString(),
      `"${f.notes || ""}"`,
    ];
  });

  const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `filtros_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
