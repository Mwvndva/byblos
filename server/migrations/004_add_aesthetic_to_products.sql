-- Add aesthetic column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS aesthetic VARCHAR(50) DEFAULT 'noir' NOT NULL;

-- Add index on aesthetic for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_aesthetic ON products(aesthetic);
