-- Add sold_at column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Update existing sold products to have sold_at set to current timestamp
UPDATE products 
SET sold_at = CURRENT_TIMESTAMP 
WHERE status = 'sold' AND sold_at IS NULL;

-- Create index on sold_at for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sold_at ON products(sold_at);
