// ─────────────────────────────────────────────────────────────
// PageHeader.tsx
// Encabezado de sección reutilizable — estandariza el estilo
// de título, etiqueta y descripción en todas las páginas.
// ─────────────────────────────────────────────────────────────

interface PageHeaderProps {
  label:       string;  // Etiqueta pequeña superior (ej: "Panel de Control")
  title:       string;  // Título principal grande
  description: string;  // Descripción debajo del título
}

export default function PageHeader({ label, title, description }: PageHeaderProps) {
  return (
    <section>
      <div className="flex items-center gap-2 text-agri-green-600 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
        <div className="w-4 h-[1px] bg-agri-green-600" />
        {label}
      </div>
      <h1 className="text-5xl font-black text-agri-green-950 tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-earth-500 mt-3 text-lg font-medium leading-relaxed">
        {description}
      </p>
    </section>
  );
}
