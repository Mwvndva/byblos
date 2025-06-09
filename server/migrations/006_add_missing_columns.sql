-- Add any missing columns to products table
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE products 
        ADD COLUMN status VARCHAR(20) DEFAULT 'draft' NOT NULL
        CONSTRAINT valid_status CHECK (status IN ('draft', 'published'));
    END IF;

    -- Add image column if it doesn't exist (some code might be using image instead of image_url)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'image') THEN
        ALTER TABLE products ADD COLUMN image TEXT;
        
        -- Copy data from image_url to image if image_url exists and image is null
        -- First, ensure image_url is not too long for the image column
        UPDATE products SET image = image_url 
        WHERE image IS NULL 
        AND image_url IS NOT NULL 
        AND LENGTH(image_url) <= 1000; -- Add a reasonable limit to prevent errors
    END IF;
END $$;
