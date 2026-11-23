-- Bake'n Brew menu seed for Supabase.
-- Run docs/supabase-staff-schema.sql first, then run this file in SQL Editor.
-- Source: src/data/menu.ts (27 menu entries).
-- Stock starts at 10 per new entry for demonstration purposes.
-- Existing IDs are left unchanged, preserving prices, availability, and stock.

begin;

insert into public.products (id, category_id, name, price, available, stock_quantity)
values
  ('best-sellers-1', 'best-sellers', 'Spanish Latte', 180, true, 10),
  ('best-sellers-2', 'best-sellers', 'Iced Latte', 170, true, 10),
  ('best-sellers-3', 'best-sellers', 'Cheesy Poppers Fries', 170, true, 10),
  ('best-sellers-4', 'best-sellers', 'Mac N Cheese', 250, true, 10),
  ('best-sellers-5', 'best-sellers', 'Biscoff Matcha', 180, true, 10),
  ('starters-1', 'starters', 'Classic Fries', 130, true, 10),
  ('starters-2', 'starters', 'Cheesy Fries', 140, true, 10),
  ('starters-3', 'starters', 'Chicken Poppers Fries', 170, true, 10),
  ('starters-4', 'starters', 'Beef Nachos', 190, true, 10),
  ('rice-meals-1', 'rice-meals', 'Hungarian Sausage with Mushroom Sauce', 190, true, 10),
  ('rice-meals-2', 'rice-meals', 'Chicken Cheese Steak', 190, true, 10),
  ('rice-meals-3', 'rice-meals', 'Beef Bulgogi', 190, true, 10),
  ('rice-meals-4', 'rice-meals', 'Omurice', 190, true, 10),
  ('rice-meals-5', 'rice-meals', 'Chicken Steak w/ Mashed Potato', 220, true, 10),
  ('rice-meals-6', 'rice-meals', 'Pork Steak w/ Mashed Potato', 230, true, 10),
  ('pasta-1', 'pasta', 'Mac N Cheese', 250, true, 10),
  ('pasta-2', 'pasta', 'Cajun Shrimp', 270, true, 10),
  ('pasta-3', 'pasta', 'Chicken Alfredo', 270, true, 10),
  ('pasta-4', 'pasta', 'Chicken Pesto', 270, true, 10),
  ('pasta-5', 'pasta', 'Truffle Mushroom', 280, true, 10),
  ('pasta-6', 'pasta', 'Kiniing Aglio Olio', 280, true, 10),
  ('noodles-1', 'noodles', 'Samyang Fries', 180, true, 10),
  ('noodles-2', 'noodles', 'Samyang Poppers', 200, true, 10),
  ('noodles-3', 'noodles', 'Samyang Chicken Steak', 210, true, 10),
  ('noodles-4', 'noodles', 'Mi Goreng Stirfry Veggies', 210, true, 10),
  ('chicken-wings-1', 'chicken-wings', 'Chicken Wings — 3 pcs with rice', 170, true, 10),
  ('chicken-wings-2', 'chicken-wings', 'Chicken Wings — 8 pcs', 270, true, 10)
on conflict (id) do nothing;

commit;

-- Inspect the saved catalog. A newly initialized project should show 27 rows.
select id, category_id, name, price, available, stock_quantity
from public.products
order by category_id, id;
