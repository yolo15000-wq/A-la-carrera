-- Productos y recetas base de A la Carrera
-- Ejecutar en Supabase → SQL Editor

INSERT INTO recetas (slug, nombre, precio, ingredientes) VALUES
  ('chorizo-s', 'Chorizo S (x12)', 12000, '[{"nombre":"Carne","cant":18000,"tipo":"grams"},{"nombre":"Grasa","cant":12000,"tipo":"grams"},{"nombre":"Crispeta","cant":1600,"tipo":"grams"},{"nombre":"Color","cant":660,"tipo":"grams"},{"nombre":"Proteina","cant":350,"tipo":"grams"},{"nombre":"Sal Normal","cant":120,"tipo":"grams"}]'),
  ('chorizo-m', 'Chorizo M (x5)',  8000,  '[{"nombre":"Carne","cant":18000,"tipo":"grams"},{"nombre":"Grasa","cant":12000,"tipo":"grams"},{"nombre":"Crispeta","cant":1600,"tipo":"grams"},{"nombre":"Color","cant":660,"tipo":"grams"},{"nombre":"Proteina","cant":400,"tipo":"grams"}]'),
  ('chorizo-l', 'Chorizo L (x10)', 15000, '[{"nombre":"Carne","cant":18000,"tipo":"grams"},{"nombre":"Grasa","cant":12000,"tipo":"grams"},{"nombre":"Crispeta","cant":1600,"tipo":"grams"},{"nombre":"Color","cant":660,"tipo":"grams"},{"nombre":"Proteina","cant":400,"tipo":"grams"}]'),
  ('rollo',     'Rollo de Carne',  20000, '[{"nombre":"Carne","cant":9000,"tipo":"grams"},{"nombre":"Grasa","cant":6000,"tipo":"grams"},{"nombre":"Tocineta","cant":1500,"tipo":"grams"},{"nombre":"Proteina","cant":600,"tipo":"grams"}]')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO productos (slug, nombre, stock, precio) VALUES
  ('chorizo-s', 'Chorizo S (x12)', 0, 12000),
  ('chorizo-m', 'Chorizo M (x5)',  0, 8000),
  ('chorizo-l', 'Chorizo L (x10)', 0, 15000),
  ('rollo',     'Rollo de Carne',  0, 20000)
ON CONFLICT (slug) DO NOTHING;
