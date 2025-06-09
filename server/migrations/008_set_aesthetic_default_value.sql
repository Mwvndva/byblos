-- Ensure the aesthetic column has a default value of 'noir' and is not null
DO $$
BEGIN
    -- First, set a default value for any NULL values
    UPDATE products 
    SET aesthetic = 'noir' 
    WHERE aesthetic IS NULL;
    
    -- Then modify the column to have a default value and be NOT NULL
    ALTER TABLE products 
    ALTER COLUMN aesthetic SET DEFAULT 'noir',
    ALTER COLUMN aesthetic SET NOT NULL;
    
    RAISE NOTICE 'Set default value for aesthetic column to ''noir''';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error setting default value for aesthetic column: %', SQLERRM;
END
$$;
