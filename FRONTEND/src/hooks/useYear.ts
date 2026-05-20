// ─────────────────────────────────────────────────────────────
// useYear.ts
// Retorna el año actual de forma dinámica.
// Usar en lugar de hardcodear "2024" en el footer o auth.
// ─────────────────────────────────────────────────────────────

export function useYear(): number {
  return new Date().getFullYear();
}
