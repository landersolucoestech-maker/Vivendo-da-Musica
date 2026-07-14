import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems((current) => (current.some((i) => i.id === item.id && i.kind === item.kind) ? current : [...current, item]));
  };

  const removeItem = (id: string, kind: CartItem["kind"]) => {
    setItems((current) => current.filter((i) => i.id !== id || i.kind !== kind));
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
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
