-- Add sold_at column to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Check if status column exists before trying to use it
DO $$
BEGIN
    -- First check if the column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'status') THEN
        -- Then update only if there are rows with status = 'sold'
        IF EXISTS (SELECT 1 FROM products WHERE status = 'sold' AND sold_at IS NULL) THEN
            UPDATE products 
            SET sold_at = CURRENT_TIMESTAMP 
            WHERE status = 'sold' AND sold_at IS NULL;
        END IF;
    END IF;
END
$$;

-- Create index on sold_at for faster lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_sold_at ON products(sold_at);
