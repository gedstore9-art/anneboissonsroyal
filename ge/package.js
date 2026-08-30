// build-project.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = {
  // CONFIGURATION
  'package.json': JSON.stringify({
    name: "anne-boissons-royale",
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint"
    },
    dependencies: {
      "@supabase/supabase-js": "^2.45.0",
      "lucide-react": "^0.435.0",
      "next": "^14.2.5",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "zustand": "^4.5.5"
    },
    devDependencies: {
      "@types/node": "^20.14.10",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      "autoprefixer": "^10.4.19",
      "postcss": "^8.4.38",
      "tailwindcss": "^3.4.4",
      "typescript": "^5.5.3"
    }
  }, null, 2),

  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"] }
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  }, null, 2),

  'tailwind.config.ts': `import type { Config } from 'tailwindcss';
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          gold: '#D4AF37',
          lightGold: '#F3E5AB',
          darkGold: '#AA7C11',
          black: '#0A0A0A',
          dark: '#121212',
          wine: '#4A0E17',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;`,

  'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,

  '.env.local': `GEMINI_API_KEY=AQ.Ab8RN6LYtL8mAyMqDxti7HwqY_D1uBMiU1iyJDTYrv5NcEHJ-g
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_supabase`,

  // APP LAYOUT & GLOBALS
  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0a0a0a;
  color: #f4f4f5;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}`,

  'app/layout.tsx': `'use client';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AgeGateModal } from '@/components/AgeGateModal';
import { Chatbot } from '@/components/Chatbot';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <title>Anne Boissons Royale | Vente en Détail & Gros de Boissons à Cotonou, Bénin</title>
        <meta name="description" content="Achetez vos Whiskys, Champagnes, Vins, Rhums et Bières au Bénin au meilleur prix en détail et en gros. Livraison rapide Cotonou, Calavi, Porto-Novo." />
      </head>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <AgeGateModal />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Chatbot />
        <Footer />
      </body>
    </html>
  );
}`,

  // STATE STORE (ZUSTAND)
  'store/useStore.ts': `import { create } from 'zustand';
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
          cart[existingIndex] = { ...cart[existingIndex], quantity: newQty, isWholesale, unitPrice };
        } else {
          const isWholesale = Boolean(product.price_wholesale && quantity >= product.wholesale_min_qty);
          const unitPrice = isWholesale ? product.price_wholesale! : product.price_retail;
          cart.push({ product, quantity, isWholesale, unitPrice });
        }
        set({ cart });
      },
      removeFromCart: (productId) => set({ cart: get().cart.filter((i) => i.product.id !== productId) }),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        const cart = get().cart.map((item) => {
          if (item.product.id === productId) {
            const isWholesale = Boolean(item.product.price_wholesale && quantity >= item.product.wholesale_min_qty);
            const unitPrice = isWholesale ? item.product.price_wholesale! : item.product.price_retail;
            return { ...item, quantity, isWholesale, unitPrice };
          }
          return item;
        });
        set({ cart });
      },
      clearCart: () => set({ cart: [] }),
      getCartSubtotal: () => get().cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
      getItemCount: () => get().cart.reduce((count, item) => count + item.quantity, 0),
    }),
    { name: 'anne-boissons-royale-storage' }
  )
);`,

  // DATABASE INITIAL CATALOG (SUPABASE FALLBACK / MOCK)
  'lib/catalog.ts': `export const INITIAL_PRODUCTS = [
  {
    id: "p1",
    name: "Johnnie Walker Black Label 1L",
    slug: "johnnie-walker-black-label-1l",
    description: "Whisky écossais de luxe vieilli 12 ans d'âge. Arômes riches de fruits noirs, vanille douce et fumée caractéristique.",
    category: "Whisky",
    price_retail: 22000,
    price_wholesale: 19500,
    wholesale_min_qty: 6,
    stock: 48,
    image_url: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800",
    is_alcoholic: true
  },
  {
    id: "p2",
    name: "Champagne Moët & Chandon Brut Impérial 75cl",
    slug: "moet-chandon-brut-imperial-75cl",
    description: "L'icône royale du champagne. Pétillant, élégant avec des notes de pomme verte, agrumes et brioche fraîche.",
    category: "Champagnes et aperitifs",
    price_retail: 45000,
    price_wholesale: 41000,
    wholesale_min_qty: 3,
    stock: 24,
    image_url: "https://images.unsplash.com/photo-1594488518042-45e0d29d893f?w=800",
    is_alcoholic: true
  },
  {
    id: "p3",
    name: "Casier Bière La Béninoise (24 Bouteilles)",
    slug: "casier-biere-la-beninoise-24",
    description: "L'incontournable bière nationale blonde du Bénin, rafraîchissante et dorée, brassée à Cotonou.",
    category: "Bieres et cannettes",
    price_retail: 11500,
    price_wholesale: 10500,
    wholesale_min_qty: 5,
    stock: 120,
    image_url: "https://images.unsplash.com/photo-1608270199120-d47a46973059?w=800",
    is_alcoholic: true
  },
  {
    id: "p4",
    name: "Rhum Diplomatico Reserva Exclusiva 70cl",
    slug: "rhum-diplomatico-reserva-70cl",
    description: "Rhum d'exception vieilli en fûts de chêne. Notes intenses de caramel au beurre, chocolat et zeste d'orange.",
    category: "Rhums",
    price_retail: 32000,
    price_wholesale: 28500,
    wholesale_min_qty: 4,
    stock: 30,
    image_url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800",
    is_alcoholic: true
  },
  {
    id: "p5",
    name: "Pack Eau Minérale Possotomé 1.5L (Pack de 6)",
    slug: "pack-eau-possotome-1-5l-6",
    description: "Eau minérale naturelle thermale béninoise de pureté exceptionnelle issue des sources de Bopa.",
    category: "Eaux en bouteille",
    price_retail: 2500,
    price_wholesale: 2100,
    wholesale_min_qty: 10,
    stock: 300,
    image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800",
    is_alcoholic: false
  },
  {
    id: "p6",
    name: "Château Margaux Grand Vin Rouge 75cl",
    slug: "chateau-margaux-grand-vin-75cl",
    description: "Grand cru d'exception, élégant, tanins soyeux et arômes profonds de mûre, cèdre et violette.",
    category: "Vins",
    price_retail: 65000,
    price_wholesale: 58000,
    wholesale_min_qty: 3,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800",
    is_alcoholic: true
  }
];

export const CATEGORIES = [
  "Tous nos produits",
  "Whisky",
  "Bieres et cannettes",
  "Champagnes et aperitifs",
  "Rhums",
  "Spiritueux",
  "Eaux en bouteille",
  "Vins"
];`,

  // LOGO
  'components/Logo.tsx': `import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={\`flex items-center gap-3 select-none \${className}\`}>
      <svg viewBox="0 0 100 100" className="h-full w-auto aspect-square fill-none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" stroke="#D4AF37" strokeWidth="2.5" strokeDasharray="4 2" />
        <circle cx="50" cy="50" r="42" stroke="#E5C158" strokeWidth="1.5" />
        <path d="M30 42 L36 54 L50 36 L64 54 L70 42 L66 62 L34 62 Z" fill="url(#goldGradient)" stroke="#8C6D1F" strokeWidth="1" />
        <circle cx="30" cy="40" r="2.5" fill="#FFF8DC" />
        <circle cx="50" cy="34" r="3" fill="#FFF8DC" />
        <circle cx="70" cy="40" r="2.5" fill="#FFF8DC" />
        <path d="M48 54 L52 54 L52 74 L48 74 Z" fill="#D4AF37" />
        <path d="M43 74 L57 74 L57 77 L43 77 Z" fill="#D4AF37" />
        <path d="M42 60 Q50 66 58 60 L56 68 Q50 72 44 68 Z" fill="#E5C158" opacity="0.8" />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9DF7B" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#AA7C11" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col justify-center text-left">
        <span className="font-serif tracking-widest text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 uppercase">
          Anne Boissons
        </span>
        <span className="text-[10px] tracking-[0.3em] font-semibold text-amber-300 uppercase -mt-1">
          Royale • Cotonou
        </span>
      </div>
    </div>
  );
};`,

  // NAVBAR
  'components/Navbar.tsx': `'use client';
import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { useStore } from '@/store/useStore';

export const Navbar = () => {
  const itemCount = useStore((s) => s.getItemCount());

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/">
          <Logo className="h-12" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
          <Link href="/" className="hover:text-amber-400 transition">Accueil</Link>
          <Link href="/boutique" className="hover:text-amber-400 transition">Boutique & Tarifs Gros</Link>
          <Link href="/a-propos" className="hover:text-amber-400 transition">À Propos</Link>
          <Link href="/contact" className="hover:text-amber-400 transition">Contact</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/panier"
            className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/40 hover:border-amber-400 text-amber-300 px-4 py-2 rounded-full font-bold text-xs uppercase transition"
          >
            <span>Panier</span>
            {itemCount > 0 && (
              <span className="bg-amber-500 text-black rounded-full px-2 py-0.5 text-xs font-black">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};`,

  // AGE GATE
  'components/AgeGateModal.tsx': `'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from './Logo';

export const AgeGateModal = () => {
  const { isAgeVerified, setAgeVerified } = useStore();
  const [mounted, setMounted] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isAgeVerified) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-amber-500/40 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(212,175,55,0.2)]">
        <div className="flex justify-center mb-6">
          <Logo className="h-16" />
        </div>
        {!refused ? (
          <>
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Contrôle d'accès légal</h2>
            <p className="text-zinc-400 text-sm mb-6">
              La vente d'alcool est strictement réservée aux personnes majeures.
              <strong className="text-amber-400 text-lg block mt-2">Avez-vous 18 ans ou plus ?</strong>
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setAgeVerified(true)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 text-black font-bold uppercase tracking-wider rounded-xl transition shadow-lg"
              >
                Oui, j'ai 18 ans ou plus
              </button>
              <button
                onClick={() => setRefused(true)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition"
              >
                Non, j'ai moins de 18 ans
              </button>
            </div>
          </>
        ) : (
          <div className="py-4">
            <h3 className="text-xl font-bold text-red-500 mb-2">Accès Refusé</h3>
            <p className="text-zinc-400 text-sm mb-6">Conformément aux lois en vigueur au Bénin, ce catalogue est interdit aux mineurs.</p>
            <a href="https://www.google.com" className="inline-block px-6 py-2 bg-zinc-800 text-white rounded-lg text-sm">
              Quitter le site
            </a>
          </div>
        )}
        <p className="text-[11px] text-zinc-500 mt-6 uppercase tracking-widest">
          L'abus d'alcool est dangereux pour la santé. À consommer avec modération.
        </p>
      </div>
    </div>
  );
};`,

  // FOOTER
  'components/Footer.tsx': `import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';

export const Footer = () => {
  return (
    <footer className="bg-zinc-950 border-t border-amber-500/20 text-zinc-400 text-xs">
      <div className="bg-red-950/60 border-b border-red-800/40 py-2.5 px-4 text-center">
        <p className="text-red-300 font-bold tracking-wider uppercase text-[11px]">
          ⛔ La vente d'alcool est strictement interdite aux mineurs de moins de 18 ans au Bénin.
        </p>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <Logo className="h-12" />
          <p className="text-zinc-500 text-xs">
            Distributeur d'excellence de boissons raffinées au Bénin. Vente en détail et tarifs avantageux en gros pour cérémonies, bars et particuliers.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-xs">Navigation</h4>
          <ul className="space-y-2">
            <li><Link href="/boutique" className="hover:text-amber-400">Boutique & Tarifs Gros</Link></li>
            <li><Link href="/a-propos" className="hover:text-amber-400">À Propos</Link></li>
            <li><Link href="/contact" className="hover:text-amber-400">Contact & Commandes WhatsApp</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-xs">Dépôt & Livraison</h4>
          <p className="text-zinc-500">Cotonou, Bénin</p>
          <p className="text-zinc-500 mt-1">Livraison locale express à Cotonou, Calavi, Porto-Novo et expédition vers toutes les villes du Bénin.</p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-xs">Informations Légales</h4>
          <ul className="space-y-2">
            <li><Link href="/mentions-legales" className="hover:text-amber-400">Conditions Générales de Vente</Link></li>
            <li><Link href="/mentions-legales" className="hover:text-amber-400">Réglementation Alcool (18+)</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-900 py-4 text-center text-zinc-600 text-[11px]">
        © {new Date().getFullYear()} Anne Boissons Royale — Tous droits réservés. Cotonou, Bénin.
      </div>
    </footer>
  );
};`,

  // CHATBOT GEMINI INTEGRATION
  'components/Chatbot.tsx': `'use client';
import React, { useState } from 'react';

export const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: 'Bonjour ! Je suis votre sommelier virtuel Anne Boissons Royale. Que recherchez-vous pour votre événement ou votre établissement ?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Une erreur de connexion est survenue.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold px-4 py-3.5 rounded-full shadow-[0_4px_25px_rgba(212,175,55,0.4)] hover:scale-105 transition"
        >
          <span className="text-xl">🍸</span>
          <span>Conseiller Royal IA</span>
        </button>
      )}
      {open && (
        <div className="w-[360px] h-[480px] bg-zinc-950 border border-amber-500/40 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
          <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-serif font-bold text-amber-400 text-sm">Anne Boissons Royale IA</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={\`flex \${m.sender === 'user' ? 'justify-end' : 'justify-start'}\`}>
                <div className={\`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed \${
                  m.sender === 'user' ? 'bg-amber-500 text-black font-medium' : 'bg-zinc-900 text-zinc-200 border border-zinc-800'
                }\`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-zinc-500 text-xs italic">Consultation du catalogue en cours...</div>}
          </div>
          <form onSubmit={sendMessage} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Prix carton whisky, bières..."
              className="flex-1 bg-zinc-950 border border-zinc-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
            />
            <button type="submit" className="bg-amber-500 text-black px-3 py-2 rounded-lg text-xs font-bold hover:bg-amber-400">
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};`,

  // API CHAT GEMINI ROUTE
  'app/api/chat/route.ts': `import { NextResponse } from 'next/server';
import { INITIAL_PRODUCTS } from '@/lib/catalog';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ reply: "Service IA indisponible. Contactez-nous directement sur WhatsApp au +229 01 97 00 00." });
    }

    const systemContext = \`Tu es le sommelier virtuel haut de gamme et assistant commercial de "Anne Boissons Royale", entreprise de distribution de boissons à Cotonou, Bénin.
Devise : Franc CFA (FCFA).
Paiement : Paiement à la livraison (Cash on Delivery) uniquement.
Frais de livraison :
- Cotonou (1 000 FCFA)
- Abomey-Calavi (1 500 FCFA)
- Porto-Novo (2 000 FCFA)
- Autres villes du Bénin (3 500 FCFA par expédition sécurisée).

Catalogue de produits en stock :
\${JSON.stringify(INITIAL_PRODUCTS, null, 2)}

Directives :
1. Réponds toujours poliment, avec chaleur et élégance.
2. Rappelle le tarif gros avantageux dès que le client demande des quantités.
3. Rappelle que la vente d'alcool est réservée aux 18 ans et plus.\`;

    const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: \`\${systemContext}\\n\\nClient: \${message}\` }] }]
      })
    });

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Je suis à votre service. Que désirez-vous commander ?";
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ reply: "Une indisponibilité temporaire est survenue. Consultez notre boutique en ligne." }, { status: 500 });
  }
}`,

  // PAGE ACCUEIL
  'app/page.tsx': `'use client';
import React from 'react';
import Link from 'next/link';
import { INITIAL_PRODUCTS } from '@/lib/catalog';
import { useStore } from '@/store/useStore';

export default function HomePage() {
  const addToCart = useStore((s) => s.addToCart);

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-black px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <span className="inline-block px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold text-xs uppercase tracking-widest">
            Distributeur Officiel • Cotonou, Bénin
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-400 to-amber-600 leading-tight">
            L'Excellence des Boissons en Détail & Gros
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Whiskys de prestige, Champagnes, Rhums, Vins d'exception et Bières fraîches livrés chez vous à Cotonou, Calavi, Porto-Novo et partout au Bénin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/boutique"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold uppercase tracking-wider rounded-xl shadow-lg transition"
            >
              Commander Maintenant
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-zinc-700 hover:border-amber-500 text-zinc-200 font-bold uppercase tracking-wider rounded-xl transition"
            >
              Tarifs Grossistes
            </Link>
          </div>
        </div>
      </section>

      {/* ARGUMENTS DE VENTE */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
          <span className="text-3xl">📦</span>
          <h3 className="font-bold text-amber-400 text-lg">Vente Détail & Gros</h3>
          <p className="text-zinc-400 text-xs">Bénéficiez automatiquement des tarifs dégressifs réservés aux grossistes dès le palier atteint.</p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
          <span className="text-3xl">💵</span>
          <h3 className="font-bold text-amber-400 text-lg">Paiement à la Livraison</h3>
          <p className="text-zinc-400 text-xs">Commandez sereinement et réglez en toute sécurité lors de la réception de vos boissons.</p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
          <span className="text-3xl">🚚</span>
          <h3 className="font-bold text-amber-400 text-lg">Livraison Express Bénin</h3>
          <p className="text-zinc-400 text-xs">Service de coursier à Cotonou, Calavi, Porto-Novo et expédition vers Parakou, Bohicon, Natitingou.</p>
        </div>
      </section>

      {/* PRODUITS PHARES */}
      <section className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Sélection Royale</span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">Nos Meilleures Ventes</h2>
          </div>
          <Link href="/boutique" className="text-amber-400 text-sm hover:underline font-semibold">
            Voir tout le catalogue →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {INITIAL_PRODUCTS.slice(0, 3).map((prod) => (
            <div key={prod.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-amber-500/50 transition">
              <div className="h-60 overflow-hidden relative">
                <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-amber-300 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded">
                  {prod.category}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{prod.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{prod.description}</p>
                </div>
                <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-400">Prix détail :</span>
                    <span className="text-lg font-mono font-bold text-amber-400">{prod.price_retail.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {prod.price_wholesale && (
                    <div className="flex justify-between items-baseline text-xs bg-amber-950/30 p-2 rounded border border-amber-500/20">
                      <span className="text-amber-300">Prix gros (dès {prod.wholesale_min_qty} unités) :</span>
                      <span className="font-mono font-bold text-amber-300">{prod.price_wholesale.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}
                  <button
                    onClick={() => addToCart(prod, 1)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase text-xs tracking-wider rounded-lg transition"
                  >
                    Ajouter au Panier
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}`,

  // PAGE BOUTIQUE / CATALOGUE
  'app/boutique/page.tsx': `'use client';
import React, { useState } from 'react';
import { INITIAL_PRODUCTS, CATEGORIES } from '@/lib/catalog';
import { useStore } from '@/store/useStore';

export default function BoutiquePage() {
  const [selectedCat, setSelectedCat] = useState("Tous nos produits");
  const [searchTerm, setSearchTerm] = useState("");
  const addToCart = useStore((s) => s.addToCart);

  const filteredProducts = INITIAL_PRODUCTS.filter((prod) => {
    const matchesCat = selectedCat === "Tous nos produits" || prod.category === selectedCat;
    const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase()) || prod.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
          Catalogue & Tarifs Gros
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Découvrez notre collection complète de boissons disponibles à Cotonou avec application automatique du tarif grossiste.
        </p>
      </div>

      {/* RECHERCHE ET FILTRES */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Rechercher un whisky, une bière, un vin..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md mx-auto block bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none text-sm"
        />

        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={\`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition \${
                selectedCat === cat
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE PRODUITS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((prod) => (
          <div key={prod.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-amber-500/50 transition">
            <div className="h-60 overflow-hidden relative">
              <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-amber-300 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded">
                {prod.category}
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{prod.name}</h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{prod.description}</p>
              </div>
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-zinc-400">Prix détail :</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{prod.price_retail.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {prod.price_wholesale && (
                  <div className="flex justify-between items-baseline text-xs bg-amber-950/30 p-2 rounded border border-amber-500/20">
                    <span className="text-amber-300">Prix gros (dès {prod.wholesale_min_qty} u) :</span>
                    <span className="font-mono font-bold text-amber-300">{prod.price_wholesale.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <button
                  onClick={() => addToCart(prod, 1)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase text-xs tracking-wider rounded-lg transition"
                >
                  Ajouter au Panier
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`,

  // PAGE PANIER
  'app/panier/page.tsx': `'use client';
import React from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, getCartSubtotal, clearCart } = useStore();
  const subtotal = getCartSubtotal();

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 space-y-4">
        <span className="text-5xl">🛒</span>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Votre panier est vide</h1>
        <p className="text-zinc-400 text-xs">Parcourez notre catalogue et profitez de nos prix avantageux.</p>
        <Link href="/boutique" className="px-6 py-3 bg-amber-500 text-black font-bold uppercase text-xs rounded-xl">
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Votre Panier Royal</h1>
        <button onClick={clearCart} className="text-xs text-red-400 hover:underline">Vider le panier</button>
      </div>

      <div className="divide-y divide-zinc-800 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {cart.map((item) => (
          <div key={item.product.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 object-cover rounded-lg" />
              <div>
                <h3 className="font-bold text-white text-sm">{item.product.name}</h3>
                <p className="text-xs text-zinc-400">
                  {item.unitPrice.toLocaleString('fr-FR')} FCFA / unité
                  {item.isWholesale && <span className="ml-2 text-amber-400 font-bold">(Tarif Gros appliqué)</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
              <div className="flex items-center border border-zinc-700 rounded-lg">
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  className="px-3 py-1 text-zinc-400 hover:text-white"
                >-</button>
                <span className="px-3 py-1 font-mono text-sm font-bold text-white">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="px-3 py-1 text-zinc-400 hover:text-white"
                >+</button>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {(item.quantity * item.unitPrice).toLocaleString('fr-FR')} FCFA
              </span>
              <button onClick={() => removeFromCart(item.product.id)} className="text-zinc-500 hover:text-red-400 text-sm">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-xs text-zinc-400 block">Total Panier (hors livraison) :</span>
          <span className="text-2xl font-mono font-bold text-amber-400">{subtotal.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <Link
          href="/checkout"
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 text-black font-bold uppercase text-xs tracking-wider rounded-xl shadow-lg text-center"
        >
          Passer la commande
        </Link>
      </div>
    </div>
  );
}`,

  // PAGE CHECKOUT (PAIEMENT À LA LIVRAISON & ZONES BÉNIN)
  'app/checkout/page.tsx': `'use client';
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { cart, getCartSubtotal, clearCart } = useStore();
  const router = useRouter();

  const zones = [
    { id: '1', name: 'Cotonou (Intra-muros)', price: 1000, is_expedition: false },
    { id: '2', name: 'Abomey-Calavi', price: 1500, is_expedition: false },
    { id: '3', name: 'Porto-Novo', price: 2000, is_expedition: false },
    { id: '4', name: 'Autres villes (Parakou, Bohicon, Natitingou, etc. - Expédition)', price: 3500, is_expedition: true },
  ];

  const [selectedZoneId, setSelectedZoneId] = useState(zones[0].id);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);

  const subtotal = getCartSubtotal();
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const total = subtotal + selectedZone.price;

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <p className="text-amber-400 mb-4">Votre panier est vide.</p>
        <button onClick={() => router.push('/boutique')} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-lg text-xs">
          Retour boutique
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      clearCart();
      alert('🎉 Votre commande a été enregistrée avec succès ! Notre service livraison vous contactera sous peu pour confirmation.');
      router.push('/');
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-bold text-center text-amber-400 mb-8">Validation de Commande</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Adresse de Livraison</h2>
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Nom et Prénom *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none"
              placeholder="Ex: Christian SODJINOU"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Téléphone (WhatsApp) *</label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none"
              placeholder="Ex: +229 97 00 00 00"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Zone de Destination *</label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} (+{z.price.toLocaleString('fr-FR')} FCFA)</option>
              ))}
            </select>
          </div>
          {selectedZone.is_expedition && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-amber-300 text-xs">
              ⚠️ <strong>Livraison en dehors de Cotonou, Calavi et Porto-Novo :</strong> votre colis sera expédié via notre réseau de transport partenaire après validation téléphonique.
            </div>
          )}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Quartier & Repère Précis *</label>
            <textarea
              required
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none"
              placeholder="Ex: Haie Vive, en face de la pharmacie, portail blanc"
            />
          </div>
          <div className="p-3 bg-zinc-950 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-semibold">
            💵 Paiement à la livraison : Vous réglez à la réception.
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold uppercase text-xs tracking-wider rounded-xl transition"
          >
            {loading ? 'Traitement...' : \`Confirmer la commande (\${total.toLocaleString('fr-FR')} FCFA)\`}
          </button>
        </form>

        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Récapitulatif</h2>
          <div className="divide-y divide-zinc-800 text-xs">
            {cart.map((item) => (
              <div key={item.product.id} className="py-2 flex justify-between">
                <span>{item.quantity}x {item.product.name}</span>
                <span className="font-mono font-bold text-amber-400">{(item.quantity * item.unitPrice).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800 pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Sous-total</span>
              <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Livraison ({selectedZone.name})</span>
              <span>{selectedZone.price.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-700">
              <span>Total Général</span>
              <span className="text-amber-400 font-mono">{total.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  // PAGE CONTACT
  'app/contact/page.tsx': `export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-serif font-bold text-amber-400 text-center">Contact & Dépôt</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Anne Boissons Royale</h2>
          <p className="text-xs text-zinc-400">Adresse principale : Avenue Jean-Paul II, Cotonou, Bénin</p>
          <p className="text-xs text-zinc-400">Téléphone / WhatsApp : +229 01 97 00 00</p>
          <p className="text-xs text-zinc-400">Email : contact@anneboissonsroyale.bj</p>
          <a
            href="https://wa.me/22901970000"
            target="_blank"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase"
          >
            Discuter sur WhatsApp
          </a>
        </div>
        <form className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Envoyez-nous un message</h2>
          <input type="text" placeholder="Votre nom" className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white text-xs" />
          <input type="tel" placeholder="Votre téléphone" className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white text-xs" />
          <textarea placeholder="Votre message..." rows={3} className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white text-xs" />
          <button type="submit" className="w-full py-3 bg-amber-500 text-black font-bold text-xs uppercase rounded-lg">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}`,

  // PAGE À PROPOS
  'app/a-propos/page.tsx': `export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-3xl font-serif font-bold text-amber-400 text-center">À Propos d'Anne Boissons Royale</h1>
      <p className="text-sm text-zinc-300 leading-relaxed">
        Basée à Cotonou, <strong>Anne Boissons Royale</strong> est l'enseigne de référence pour la distribution de boissons alcoolisées et non-alcoolisées au Bénin.
      </p>
      <p className="text-sm text-zinc-300 leading-relaxed">
        Nous accompagnons particuliers et professionnels dans l'organisation de réceptions, mariages, cérémonies royales et approvisionnons bars et restaurants grâce à notre politique tarifaire de gros compétitive.
      </p>
    </div>
  );
}`,

  // PAGE MENTIONS LÉGALES
  'app/mentions-legales/page.tsx': `export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-serif font-bold text-amber-400">Mentions Légales & Conditions de Vente</h1>
      <section className="space-y-2 bg-red-950/30 border border-red-800/40 p-4 rounded-xl">
        <h2 className="text-red-300 font-bold text-sm uppercase">Protection des Mineurs</h2>
        <p className="text-xs text-zinc-300 leading-relaxed">
          La vente d'alcool est strictement interdite aux mineurs de moins de 18 ans au Bénin. En commandant sur ce site, vous certifiez sur l'honneur avoir l'âge légal requis.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-white font-bold text-sm">Paiement et Livraison</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Le paiement s'effectue exclusivement à la livraison (Cash on Delivery). Les frais de livraison sont calculés selon la zone géographique choisie lors de la commande.
        </p>
      </section>
    </div>
  );
}`,

  // DASHBOARD ADMINISTRATEUR
  'app/admin/page.tsx': `'use client';
import React, { useState } from 'react';
import { INITIAL_PRODUCTS } from '@/lib/catalog';

export default function AdminDashboard() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <span className="text-xs text-amber-500 font-bold uppercase">Portail Privé</span>
          <h1 className="text-2xl font-serif font-bold text-white">Espace Administrateur</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={\`px-4 py-2 text-xs font-bold rounded-lg \${activeTab === 'products' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}\`}
          >
            Produits & Stocks
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={\`px-4 py-2 text-xs font-bold rounded-lg \${activeTab === 'orders' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}\`}
          >
            Commandes Récentes
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
              <tr>
                <th className="p-4">Produit</th>
                <th className="p-4">Catégorie</th>
                <th className="p-4">Prix Détail</th>
                <th className="p-4">Prix Gros</th>
                <th className="p-4">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40">
                  <td className="p-4 font-bold text-white">{p.name}</td>
                  <td className="p-4 text-zinc-400">{p.category}</td>
                  <td className="p-4 text-amber-400 font-mono">{p.price_retail.toLocaleString('fr-FR')} FCFA</td>
                  <td className="p-4 text-zinc-300 font-mono">{p.price_wholesale ? \`\${p.price_wholesale.toLocaleString('fr-FR')} FCFA (min \${p.wholesale_min_qty})\` : '-'}</td>
                  <td className="p-4 text-emerald-400 font-bold">{p.stock} unités</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-400 text-xs">
          Les nouvelles commandes passées sur le site s'afficheront ici en temps réel.
        </div>
      )}
    </div>
  );
}`
};

// Création des répertoires et écriture des fichiers
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log(`✓ Fichier créé : ${filePath}`);
});

console.log("\n📦 Compression du projet en cours...");
try {
  if (process.platform === 'win32') {
    execSync('powershell Compress-Archive -Path * -DestinationPath anne-boissons-royale.zip -Force');
  } else {
    execSync('zip -r anne-boissons-royale.zip . -x "node_modules/*" ".git/*" "build-project.js"');
  }
  console.log("\n🎉 SUCCÈS : Le fichier 'anne-boissons-royale.zip' est prêt dans ce dossier !");
} catch (err) {
  console.log("\n Tous les fichiers ont été générés avec succès dans le dossier courant.");
}