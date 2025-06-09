-- Alter the image_url column to use TEXT type for storing larger image data
ALTER TABLE products 
ALTER COLUMN image_url TYPE TEXT;
