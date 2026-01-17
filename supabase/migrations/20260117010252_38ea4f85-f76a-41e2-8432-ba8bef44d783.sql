-- Fix search_path for validate_portuguese_nif function
CREATE OR REPLACE FUNCTION public.validate_portuguese_nif(nif TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  clean_nif TEXT;
  check_digit INT;
  calculated_digit INT;
  i INT;
  sum INT := 0;
BEGIN
  -- Remove spaces and dashes
  clean_nif := regexp_replace(nif, '[^0-9]', '', 'g');
  
  -- Must be exactly 9 digits
  IF length(clean_nif) != 9 THEN
    RETURN FALSE;
  END IF;
  
  -- First digit must be 1, 2, 3, 5, 6, 7, 8, or 9
  IF substring(clean_nif, 1, 1) NOT IN ('1', '2', '3', '5', '6', '7', '8', '9') THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate checksum
  FOR i IN 1..8 LOOP
    sum := sum + (substring(clean_nif, i, 1)::INT * (10 - i));
  END LOOP;
  
  calculated_digit := 11 - (sum % 11);
  IF calculated_digit >= 10 THEN
    calculated_digit := 0;
  END IF;
  
  check_digit := substring(clean_nif, 9, 1)::INT;
  
  RETURN check_digit = calculated_digit;
END;
$$;