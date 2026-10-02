/*
# Add address column to patients

1. Modified Tables
- `patients`: added `address` text column (nullable) to store patient address.
2. Security
- No policy changes; existing owner-scoped RLS policies already cover the new column.
3. Notes
- Non-destructive: only adds a nullable column.
*/

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS address text;
