-- Reset Schema (Clean Slate)
DROP TABLE IF EXISTS market_listings CASCADE;
DROP TABLE IF EXISTS player_inventory CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP FUNCTION IF EXISTS buy_market_item(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS use_inventory_item(UUID, UUID);
DROP FUNCTION IF EXISTS list_item_for_sale(UUID, UUID, INTEGER, INTEGER);

-- Create items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'food')),
  effect_type TEXT NOT NULL CHECK (effect_type IN ('power', 'energy')),
  effect_value INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  base_price INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items are viewable by everyone" ON items
  FOR SELECT USING (true);


-- Create player_inventory table
CREATE TABLE player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS for inventory
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON player_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON player_inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own inventory" ON player_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Create market_listings table
CREATE TABLE market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES player_stats(id) ON DELETE SET NULL, 
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for market
ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market listings are viewable by everyone" ON market_listings
  FOR SELECT USING (true);

CREATE POLICY "Users can create listings" ON market_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can delete own listings" ON market_listings
  FOR DELETE USING (auth.uid() = seller_id);  


-- Insert initial items
INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price) VALUES
('Baretta 9mm', 'weapon', 'power', 1, 'https://cdn-icons-png.flaticon.com/512/2619/2619171.png', 'Standart tabanca. Her biri 1 askerin gücünü +1 artırır.', 5000),
('Su', 'food', 'energy', 10, 'https://cdn-icons-png.flaticon.com/512/3105/3105807.png', 'Temiz su. 10 Enerji yeniler.', 500),
('Kola', 'food', 'energy', 20, 'https://cdn-icons-png.flaticon.com/512/2722/2722527.png', 'Soğuk kola. 20 Enerji yeniler.', 1000),
('Elma', 'food', 'energy', 5, 'https://cdn-icons-png.flaticon.com/512/415/415733.png', 'Taze elma. 5 Enerji yeniler.', 250);


-- SEED MARKET WITH 100 OF EACH ITEM
DO $$
DECLARE
  r_item RECORD;
BEGIN
  -- Loop through just inserted items
  FOR r_item IN SELECT * FROM items LOOP
    INSERT INTO market_listings (item_id, price, quantity, is_system)
    VALUES (r_item.id, r_item.base_price, 100, TRUE);
  END LOOP;
END;
$$;


-- Functions for Market Logic

-- Function: Buy Item
CREATE OR REPLACE FUNCTION buy_market_item(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_quantity INTEGER
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_listing market_listings%ROWTYPE;
  v_buyer_stats player_stats%ROWTYPE;
  v_total_price INTEGER;
BEGIN
  -- Get listing
  SELECT * INTO v_listing FROM market_listings WHERE id = p_listing_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'İlan bulunamadı.';
    RETURN;
  END IF;

  IF v_listing.quantity < p_quantity THEN
    RETURN QUERY SELECT FALSE, 'Yetersiz stok.';
    RETURN;
  END IF;

  v_total_price := v_listing.price * p_quantity;

  -- Get buyer stats
  SELECT * INTO v_buyer_stats FROM player_stats WHERE id = p_buyer_id;
  IF v_buyer_stats.cash < v_total_price THEN
    RETURN QUERY SELECT FALSE, 'Yetersiz para.';
    RETURN;
  END IF;

  -- Transaction
  -- 1. Deduct money from buyer
  UPDATE player_stats SET cash = cash - v_total_price WHERE id = p_buyer_id;

  -- 2. Add money to seller (if not system)
  IF NOT v_listing.is_system AND v_listing.seller_id IS NOT NULL THEN
    UPDATE player_stats SET cash = cash + v_total_price WHERE id = v_listing.seller_id;
  END IF;

  -- 3. Add item to buyer inventory
  INSERT INTO player_inventory (user_id, item_id, quantity)
  VALUES (p_buyer_id, v_listing.item_id, p_quantity)
  ON CONFLICT (user_id, item_id)
  DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;

  -- 4. Update/Delete listing
  IF v_listing.quantity = p_quantity THEN
    DELETE FROM market_listings WHERE id = p_listing_id;
  ELSE
    UPDATE market_listings SET quantity = quantity - p_quantity WHERE id = p_listing_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'Satın alma başarılı.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Use Item
CREATE OR REPLACE FUNCTION use_inventory_item(
  p_user_id UUID,
  p_item_id UUID
) RETURNS TABLE(success BOOLEAN, message TEXT, new_value INTEGER) AS $$
DECLARE
  v_inventory player_inventory%ROWTYPE;
  v_item items%ROWTYPE;
  v_current_val INTEGER;
BEGIN
  -- Get inventory item
  SELECT * INTO v_inventory FROM player_inventory WHERE user_id = p_user_id AND item_id = p_item_id;
  IF NOT FOUND OR v_inventory.quantity < 1 THEN
    RETURN QUERY SELECT FALSE, 'Eşya bulunamadı.', 0;
    RETURN;
  END IF;

  -- Get item details
  SELECT * INTO v_item FROM items WHERE id = p_item_id;
  
  -- Apply Effect
  IF v_item.effect_type = 'energy' THEN
    SELECT energy INTO v_current_val FROM player_stats WHERE id = p_user_id;
    IF v_current_val >= 100 THEN
      RETURN QUERY SELECT FALSE, 'Enerjin zaten dolu.', v_current_val;
      RETURN;
    END IF;
    
    UPDATE player_stats 
    SET energy = LEAST(100, energy + v_item.effect_value)
    WHERE id = p_user_id
    RETURNING energy INTO v_current_val;
    
  ELSE
    RETURN QUERY SELECT FALSE, 'Bu eşya kullanılamaz (Pasif etki).', 0;
    RETURN;
  END IF;

  -- Decrease quantity
  IF v_inventory.quantity = 1 THEN
    DELETE FROM player_inventory WHERE id = v_inventory.id;
  ELSE
    UPDATE player_inventory SET quantity = quantity - 1 WHERE id = v_inventory.id;
  END IF;

  RETURN QUERY SELECT TRUE, v_item.name || ' kullanıldı.', v_current_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: List Item
CREATE OR REPLACE FUNCTION list_item_for_sale(
  p_user_id UUID,
  p_item_id UUID,
  p_quantity INTEGER,
  p_price INTEGER
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_inventory player_inventory%ROWTYPE;
BEGIN
  -- Check inventory
  SELECT * INTO v_inventory FROM player_inventory WHERE user_id = p_user_id AND item_id = p_item_id;
  IF NOT FOUND OR v_inventory.quantity < p_quantity THEN
    RETURN QUERY SELECT FALSE, 'Yetersiz eşya.';
    RETURN;
  END IF;

  -- Create listing
  INSERT INTO market_listings (seller_id, item_id, price, quantity, is_system)
  VALUES (p_user_id, p_item_id, p_price, p_quantity, FALSE);

  -- Decrease inventory
  IF v_inventory.quantity = p_quantity THEN
    DELETE FROM player_inventory WHERE id = v_inventory.id;
  ELSE
    UPDATE player_inventory SET quantity = quantity - p_quantity WHERE id = v_inventory.id;
  END IF;

  RETURN QUERY SELECT TRUE, 'İlana koyuldu.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
