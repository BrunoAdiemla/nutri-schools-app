-- Migration: Add unidade_medida_compra column to lista_compras_itens table
-- Description: Adds a new column to store the purchase unit of measurement for shopping list items
-- Date: 2026-02-04
-- Author: Kiro AI Assistant

-- Add the unidade_medida_compra column with CHECK constraint
-- Column is nullable by default - users can edit it later
ALTER TABLE public.lista_compras_itens
ADD COLUMN unidade_medida_compra TEXT CHECK (unidade_medida_compra IN ('l', 'ml', 'kg', 'g'));

-- Add comment to the column
COMMENT ON COLUMN public.lista_compras_itens.unidade_medida_compra IS 'Unidade de medida para compra do ingrediente. Valores permitidos: l, ml, kg, g. Pode ser NULL (usuário edita posteriormente).';

-- Verification query (optional - run separately to check results)
-- SELECT id, ingrediente_nome, unidade_medida, unidade_medida_compra 
-- FROM public.lista_compras_itens 
-- LIMIT 10;
