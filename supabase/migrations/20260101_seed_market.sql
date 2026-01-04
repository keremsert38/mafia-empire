-- Seed Market with 100 of each item as System Listings
-- Run this AFTER running the previous migration (create_market_inventory.sql)

DO $$
DECLARE
  r_item RECORD;
BEGIN
  -- Loop through all items created in the previous step
  FOR r_item IN SELECT * FROM items LOOP
    -- Insert a system listing for each item
    -- Quantity: 100
    -- Price: Base Price defined in items table
    INSERT INTO market_listings (item_id, price, quantity, is_system)
    VALUES (r_item.id, r_item.base_price, 100, TRUE);
  END LOOP;
END;
$$;
