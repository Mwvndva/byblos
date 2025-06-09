-- Remove the duplicate 'image' column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'products' AND column_name = 'image') THEN
        ALTER TABLE products DROP COLUMN image;
        RAISE NOTICE 'Dropped the duplicate image column from products table';
    ELSE
        RAISE NOTICE 'No duplicate image column found in products table';
    END IF;
END
$$;

-- Drop the status column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE products DROP COLUMN status;
        RAISE NOTICE 'Dropped the status column from products table';
    ELSE
        RAISE NOTICE 'No status column found in products table';
    END IF;
END
$$;
