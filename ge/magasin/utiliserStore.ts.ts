// store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price_retail: number;
  price_wholesale: number | null;
  wholesale_min_qty: number;
  stock: number;
  image_url: string;
  is_alcoholic: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  isWholesale: boolean;
  unitPrice: number;
}

interface StoreState {
  cart: CartItem[];
  isAgeVerified: boolean;
  setAgeVerified: (status: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartSubtotal: () => number;
  getItemCount: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      isAgeVerified: false,
      setAgeVerified: (status) => set({ isAgeVerified: status }),

      addToCart: (product, quantity = 1) => {
        const cart = [...get().cart];
        const existingIndex = cart.findIndex((item) => item.product.id === product.id);

        if (existingIndex > -1) {
          const newQty = cart[existingIndex].quantity + quantity;
          const isWholesale = Boolean(product.price_wholesale && newQty >= product.wholesale_min_qty);
          const unitPrice = isWholesale ? product.price_wholesale! : product.price_retail;

          cart[existingIndex] = {
            ...cart[existingIndex],
            quantity: newQty,
            isWholesale,
            unitPrice,
          };
        } else {
          const isWholesale = Boolean(product.price_wholesale && quantity >= product.wholesale_min_qty);
          const unitPrice = isWholesale ? product.price_wholesale! : product.price_retail;

          cart.push({
            product,
            quantity,
            isWholesale,
            unitPrice,
          });
        }
        set({ cart });
      },

      removeFromCart: (productId) => {
        set({ cart: get().cart.filter((item) => item.product.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        const cart = get().cart.map((item) => {
          if (item.product.id === productId) {
            const isWholesale = Boolean(
              item.product.price_wholesale && quantity >= item.product.wholesale_min_qty
            );
            const unitPrice = isWholesale ? item.product.price_wholesale! : item.product.price_retail;
            return { ...item, quantity, isWholesale, unitPrice };
          }
          return item;
        });
        set({ cart });
      },

      clearCart: () => set({ cart: [] }),

      getCartSubtotal: () => {
        return get().cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
      },

      getItemCount: () => {
        return get().cart.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'anne-boissons-royale-storage',
    }
  )
);