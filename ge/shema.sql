-- Création des types énumérés
CREATE TYPE order_status AS ENUM ('en_attente', 'en_cours_livraison', 'livree', 'annulee');
CREATE TYPE product_category AS ENUM (
  'Whisky', 
  'Bieres et cannettes', 
  'Champagnes et aperitifs', 
  'Rhums', 
  'Spiritueux', 
  'Eaux en bouteille', 
  'Vins'
);

-- Table des Produits
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category product_category NOT NULL,
  price_retail NUMERIC(10, 2) NOT NULL, -- Prix détail en FCFA
  price_wholesale NUMERIC(10, 2),       -- Prix de gros en FCFA
  wholesale_min_qty INT DEFAULT 6,      -- Quantité min pour prix de gros
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  is_alcoholic BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Zones de Livraison (Bénin)
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Frais en FCFA
  is_expedition BOOLEAN DEFAULT FALSE,     -- Si TRUE: Expédition hors agglomération Cotonou
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Commandes
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_fee NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'Cash on Delivery (Paiement à la livraison)',
  status order_status DEFAULT 'en_attente',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Détail des Commandes
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  is_wholesale BOOLEAN DEFAULT FALSE,
  total_price NUMERIC(10, 2) NOT NULL
);

-- Insertion des zones de livraison par défaut
INSERT INTO delivery_zones (name, price, is_expedition) VALUES
('Cotonou (Intra-muros)', 1000, FALSE),
('Abomey-Calavi', 1500, FALSE),
('Porto-Novo', 2000, FALSE),
('Autres Villes (Parakou, Bohicon, Natitingou, etc. - Expédition)', 3500, TRUE);

-- Insertion de produits d'exemple
INSERT INTO products (name, slug, description, category, price_retail, price_wholesale, wholesale_min_qty, stock, image_url, is_alcoholic) VALUES
('Johnnie Walker Black Label 1L', 'johnnie-walker-black-1l', 'Whisky écossais de renom, vieilli 12 ans.', 'Whisky', 22000, 19500, 6, 48, 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800', true),
('Bière Béninoise La Béninoise (Casier 24)', 'casier-beninoise-24', 'L''authentique bière nationale du Bénin en format casier.', 'Bieres et cannettes', 11500, 10500, 5, 120, 'https://images.unsplash.com/photo-1608270199120-d47a46973059?w=800', true),
('Champagne Moët & Chandon Brut Impérial', 'moet-chandon-brut', 'L''icône mondiale du champagne pour vos célébrations royales.', 'Champagnes et aperitifs', 45000, 41000, 3, 24, 'https://images.unsplash.com/photo-1594488518042-45e0d29d893f?w=800', true),
('Pack Eau Minérale Possotomé 1.5L (Pack de 6)', 'pack-eau-possotome-6', 'Eau minérale naturelle thermale du Bénin.', 'Eaux en bouteille', 2500, 2200, 10, 200, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800', false);