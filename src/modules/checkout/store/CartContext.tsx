import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  kind: "course" | "beat_license" | "product";
  id: string;
  title: string;
  priceCents: number;
  currency: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, kind: CartItem["kind"]) => void;
  clear: () => void;
  totalCents: number;
}

const CART_STORAGE_KEY = 'vdm_cart_v1';
const VALID_KINDS = new Set<CartItem['kind']>(['course', 'beat_license', 'product']);
const CartContext = createContext<CartContextValue | null>(null);

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CartItem>;
  return Boolean(
    candidate.kind
    && VALID_KINDS.has(candidate.kind)
    && typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.title === 'string'
    && candidate.title.length > 0
    && typeof candidate.priceCents === 'number'
    && Number.isSafeInteger(candidate.priceCents)
    && candidate.priceCents >= 0
    && typeof candidate.currency === 'string'
    && /^[A-Z]{3}$/.test(candidate.currency),
  );
};

const readStoredCart = (): CartItem[] => {
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((current) => (current.some((existing) => existing.id === item.id && existing.kind === item.kind)
      ? current
      : [...current, item]));
  };

  const removeItem = (id: string, kind: CartItem["kind"]) => {
    setItems((current) => current.filter((item) => item.id !== id || item.kind !== kind));
  };

  const clear = () => setItems([]);

  const totalCents = useMemo(() => items.reduce((sum, item) => sum + item.priceCents, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, totalCents }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
