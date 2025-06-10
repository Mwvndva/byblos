-- Add status column to products if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE products 
        ADD COLUMN status VARCHAR(20) DEFAULT 'draft' NOT NULL;
        
        -- Add index on status for filtering
        CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
        
        RAISE NOTICE 'Added status column to products table';
    ELSE
        RAISE NOTICE 'status column already exists in products table';
    END IF;
END
$$;
