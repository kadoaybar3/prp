/*
# Add total_price columns to hair_transplants and prp_cycles

1. Modified Tables
- `hair_transplants`: added `total_price` numeric column (nullable) to record the agreed-upon total procedure price.
- `prp_cycles`: added `total_price` numeric column (nullable) to record the agreed-upon total PRP cycle price.
2. Security
- No policy changes; existing owner-scoped RLS policies already cover the new columns.
3. Notes
- Columns are nullable so existing rows are not affected.
- Non-destructive: only adds columns, does not drop or rename anything.
*/

ALTER TABLE hair_transplants
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2);

ALTER TABLE prp_cycles
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2);
