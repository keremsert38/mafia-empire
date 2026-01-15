-- =====================================================
-- ÜRÜN RESİMLERİ - PNG FORMAT
-- =====================================================

-- SİLAHLAR
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/AK-47-PNG-Clipart.png' WHERE LOWER(name) LIKE '%ak-47%' OR LOWER(name) LIKE '%ak47%' OR LOWER(name) LIKE '%tüfek%' OR LOWER(name) LIKE '%rifle%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Beretta-Gun-PNG-Clipart.png' WHERE LOWER(name) LIKE '%baretta%' OR LOWER(name) LIKE '%beretta%' OR LOWER(name) LIKE '%tabanca%' OR LOWER(name) LIKE '%pistol%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/8/Gunpowder-PNG-Pic.png' WHERE LOWER(name) LIKE '%barut%' OR LOWER(name) LIKE '%gunpowder%' OR LOWER(name) LIKE '%powder%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/03/Bullets-PNG.png' WHERE LOWER(name) LIKE '%mermi%' OR LOWER(name) LIKE '%bullet%' OR LOWER(name) LIKE '%ammo%';

-- YİYECEKLER
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/05/Apple-PNG.png' WHERE LOWER(name) LIKE '%elma%' OR LOWER(name) LIKE '%apple%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/05/Bread-PNG.png' WHERE LOWER(name) LIKE '%ekmek%' OR LOWER(name) LIKE '%bread%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/03/Food-PNG.png' WHERE LOWER(name) LIKE '%yemek%' OR LOWER(name) LIKE '%food%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/04/Orange-Free-PNG-Image.png' WHERE LOWER(name) LIKE '%meyve%' OR LOWER(name) LIKE '%fruit%' OR LOWER(name) LIKE '%portakal%';

-- İÇECEKLER
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/05/Coca-Cola-PNG.png' WHERE LOWER(name) LIKE '%kola%' OR LOWER(name) LIKE '%cola%' OR LOWER(name) LIKE '%soda%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/04/Water-Bottle-PNG.png' WHERE LOWER(name) LIKE '%su%' OR LOWER(name) LIKE '%water%';

-- SAĞLIK
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/04/First-Aid-Kit-PNG.png' WHERE LOWER(name) LIKE '%sağlık%' OR LOWER(name) LIKE '%health%' OR LOWER(name) LIKE '%kit%' OR LOWER(name) LIKE '%ilk yardım%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Medicine-PNG-Image.png' WHERE LOWER(name) LIKE '%ilaç%' OR LOWER(name) LIKE '%medicine%' OR LOWER(name) LIKE '%drug%' OR LOWER(name) LIKE '%pill%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/Syringe-PNG.png' WHERE LOWER(name) LIKE '%şırınga%' OR LOWER(name) LIKE '%syringe%' OR LOWER(name) LIKE '%injection%';

-- HAMMADDELER
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Metal-PNG-Picture.png' WHERE LOWER(name) LIKE '%metal%' OR LOWER(name) LIKE '%steel%' OR LOWER(name) LIKE '%çelik%' OR LOWER(name) LIKE '%demir%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Plastic-PNG-Image.png' WHERE LOWER(name) LIKE '%plastik%' OR LOWER(name) LIKE '%plastic%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Fabric-PNG-Picture.png' WHERE LOWER(name) LIKE '%kumaş%' OR LOWER(name) LIKE '%fabric%' OR LOWER(name) LIKE '%cloth%' OR LOWER(name) LIKE '%textile%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Wood-Plank-PNG.png' WHERE LOWER(name) LIKE '%tahta%' OR LOWER(name) LIKE '%wood%' OR LOWER(name) LIKE '%kereste%';

-- ELEKTRONİK
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/Microchip-PNG.png' WHERE LOWER(name) LIKE '%çip%' OR LOWER(name) LIKE '%chip%' OR LOWER(name) LIKE '%mikroçip%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Smartphone-PNG-Picture.png' WHERE LOWER(name) LIKE '%telefon%' OR LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobil%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/Laptop-PNG.png' WHERE LOWER(name) LIKE '%bilgisayar%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%laptop%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/USB-Cable-PNG.png' WHERE LOWER(name) LIKE '%kablo%' OR LOWER(name) LIKE '%cable%' OR LOWER(name) LIKE '%wire%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/Circuit-Board-PNG.png' WHERE LOWER(name) LIKE '%elektronik%' OR LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%circuit%';

-- DEĞERLİ EŞYA
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/04/Gold-PNG.png' WHERE LOWER(name) LIKE '%altın%' OR LOWER(name) LIKE '%gold%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/03/Diamond-PNG.png' WHERE LOWER(name) LIKE '%elmas%' OR LOWER(name) LIKE '%diamond%' OR LOWER(name) LIKE '%gem%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Jewelry-PNG-Picture.png' WHERE LOWER(name) LIKE '%mücevher%' OR LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%jewel%';

-- PAKET / KUTU
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2/Cardboard-Box-PNG.png' WHERE LOWER(name) LIKE '%paket%' OR LOWER(name) LIKE '%package%' OR LOWER(name) LIKE '%kargo%' OR LOWER(name) LIKE '%kutu%' OR LOWER(name) LIKE '%box%';

-- KİMYASAL
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Chemical-PNG.png' WHERE LOWER(name) LIKE '%kimyasal%' OR LOWER(name) LIKE '%chemical%' OR LOWER(name) LIKE '%asit%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Poison-PNG.png' WHERE LOWER(name) LIKE '%zehir%' OR LOWER(name) LIKE '%poison%' OR LOWER(name) LIKE '%toxic%';

-- YAKIT / ENERJİ
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Gasoline-PNG.png' WHERE LOWER(name) LIKE '%benzin%' OR LOWER(name) LIKE '%gas%' OR LOWER(name) LIKE '%fuel%' OR LOWER(name) LIKE '%petrol%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/2016/04/Battery-PNG.png' WHERE LOWER(name) LIKE '%pil%' OR LOWER(name) LIKE '%battery%' OR LOWER(name) LIKE '%batarya%';

-- PARA
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/1/Money-PNG.png' WHERE LOWER(name) LIKE '%para%' OR LOWER(name) LIKE '%money%' OR LOWER(name) LIKE '%cash%' OR LOWER(name) LIKE '%nakit%';
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/10/Gold-Coin-PNG-Photo.png' WHERE LOWER(name) LIKE '%coin%' OR LOWER(name) LIKE '%mt%' OR LOWER(name) LIKE '%token%';

-- ASKER
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Soldier-PNG-Picture.png' WHERE LOWER(name) LIKE '%asker%' OR LOWER(name) LIKE '%soldier%' OR LOWER(name) LIKE '%soldato%';

-- Varsayılan
UPDATE resources SET image_url = 'https://www.pngall.com/wp-content/uploads/5/Product-PNG-Image.png' WHERE image_url IS NULL;
