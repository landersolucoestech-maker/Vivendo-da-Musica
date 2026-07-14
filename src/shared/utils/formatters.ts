export function formatPrice(cents: number, currency = 'BRL'): string {
  const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Math.abs(cents) / 100);
  return cents < 0 ? `-${value}` : value;
}

export function formatPriceOrFree(cents: number, currency = 'BRL'): string {
  return cents === 0 ? 'Gratuito' : formatPrice(cents, currency);
}
