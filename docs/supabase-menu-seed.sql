-- Bake'n Brew menu seed for Supabase.
-- Run docs/supabase-staff-schema.sql first, then run this file in SQL Editor.
-- Source: src/data/menu.ts (57 menu entries).
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
  ('chicken-wings-2', 'chicken-wings', 'Chicken Wings — 8 pcs', 270, true, 10),
  ('burgers-1', 'burgers', 'Chicken Korean Crunch', 200, true, 10),
  ('burgers-2', 'burgers', 'Classic Cheese Beef Burger', 220, true, 10),
  ('hot-coffee-1', 'hot-coffee', 'Espresso', 140, true, 10),
  ('hot-coffee-2', 'hot-coffee', 'Long Black', 160, true, 10),
  ('hot-coffee-3', 'hot-coffee', 'Cafe Latte', 180, true, 10),
  ('hot-coffee-4', 'hot-coffee', 'Cappuccino', 180, true, 10),
  ('hot-coffee-5', 'hot-coffee', 'Flat White', 180, true, 10),
  ('hot-coffee-6', 'hot-coffee', 'Spanish Latte', 180, true, 10),
  ('hot-coffee-7', 'hot-coffee', 'V60', 190, true, 10),
  ('iced-coffee-1', 'iced-coffee', 'Iced Long Black', 170, true, 10),
  ('iced-coffee-2', 'iced-coffee', 'Iced Latte', 190, true, 10),
  ('iced-coffee-3', 'iced-coffee', 'Iced Spanish Latte', 190, true, 10),
  ('iced-coffee-4', 'iced-coffee', 'Iced V60', 190, true, 10),
  ('hojicha-1', 'hojicha', 'Hojicha Latte', 160, true, 10),
  ('hojicha-2', 'hojicha', 'Hojicha Seasalt', 180, true, 10),
  ('hojicha-3', 'hojicha', 'Hojicha Black Sesame Caramel', 180, true, 10),
  ('bakers-coffee-1', 'bakers-coffee', 'Vietnamese Latte', 190, true, 10),
  ('bakers-coffee-2', 'bakers-coffee', 'Cinespresso', 190, true, 10),
  ('bakers-coffee-3', 'bakers-coffee', 'Coconut Espresso', 190, true, 10),
  ('bakers-coffee-4', 'bakers-coffee', 'Pumpkin Iced Latte', 190, true, 10),
  ('bakers-coffee-5', 'bakers-coffee', 'Dirty Chai Latte', 190, true, 10),
  ('non-coffee-1', 'non-coffee', 'Iced Cocoa Thick Latte', 170, true, 10),
  ('non-coffee-2', 'non-coffee', 'Strawberry Choco', 170, true, 10),
  ('non-coffee-3', 'non-coffee', 'Biscoff Caramel Latte', 170, true, 10),
  ('non-coffee-4', 'non-coffee', 'Oreo Chocolate Latte', 170, true, 10),
  ('non-coffee-5', 'non-coffee', 'Hot Cocoa Latte', 170, true, 10),
  ('matcha-series-1', 'matcha-series', 'Classic Matcha', 170, true, 10),
  ('matcha-series-2', 'matcha-series', 'Strawberry Matcha', 170, true, 10),
  ('matcha-series-3', 'matcha-series', 'Matcha Seasalt Foam', 170, true, 10),
  ('matcha-series-4', 'matcha-series', 'Biscoff Matcha', 170, true, 10)
on conflict (id) do nothing;

commit;

-- Inspect the saved catalog. A newly initialized project should show 57 rows.
select id, category_id, name, price, available, stock_quantity
from public.products
order by category_id, id;
