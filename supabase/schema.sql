-- ============================================
-- CheapALot Supplier Portal - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '📦',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SUPPLIERS PROFILE TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT,
  country TEXT DEFAULT 'China',
  city TEXT,
  business_type TEXT DEFAULT 'manufacturer',
  is_approved BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  category TEXT,
  category_slug TEXT,
  price_cny_low NUMERIC(10,2),
  price_cny_high NUMERIC(10,2),
  moq INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'piece',
  image_url TEXT,
  image_path TEXT,
  stock_qty INTEGER,
  specifications TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, published
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSERT DEFAULT CATEGORIES
INSERT INTO public.categories (name_en, name_zh, slug, icon, sort_order) VALUES
  ('Toys', '玩具', 'toys', '🧸', 1),
  ('Artificial Flowers', '仿真花', 'artificial-flowers', '🌸', 2),
  ('Jewelry', '珠宝首饰', 'jewelry', '💍', 3),
  ('Hair Accessories', '头饰', 'hair-accessories', '🎀', 4),
  ('Festive Crafts', '喜庆工艺', 'festive-crafts', '🎉', 5),
  ('Decorative Crafts', '装饰工艺', 'decorative-crafts', '🖼️', 6),
  ('Photo Frames', '相框', 'photo-frames', '🖼️', 7),
  ('Porcelain & Crystal', '瓷器水晶', 'porcelain-crystal', '🍶', 8),
  ('Electronics', '电子产品', 'electronics', '📱', 9),
  ('Home & Kitchen', '家居厨具', 'home-kitchen', '🏠', 10),
  ('Apparel & Textiles', '服装纺织', 'apparel-textiles', '👕', 11),
  ('Stationery', '文具', 'stationery', '✏️', 12),
  ('Other', '其他', 'other', '📦', 99)
ON CONFLICT (slug) DO NOTHING;

-- 5. AUTO-CREATE SUPPLIER PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.suppliers (auth_id, email, contact_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'contact_name', 'New Supplier'));
  
  -- First user becomes admin
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE is_admin = TRUE) THEN
    UPDATE public.suppliers SET is_admin = TRUE, is_approved = TRUE WHERE auth_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (TRUE);

-- Suppliers: users can read their own profile, admins can read all
CREATE POLICY "Suppliers can read own profile" ON public.suppliers
  FOR SELECT USING (auth.uid() = auth_id OR is_admin = TRUE);
CREATE POLICY "Suppliers can update own profile" ON public.suppliers
  FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "Admins can update all suppliers" ON public.suppliers
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.suppliers WHERE auth_id = auth.uid() AND is_admin = TRUE));

-- Products: suppliers can CRUD their own, admins can CRUD all, public can read approved
CREATE POLICY "Public can read approved products" ON public.products
  FOR SELECT USING (status = 'approved' OR status = 'published');
CREATE POLICY "Suppliers can read own products" ON public.products
  FOR SELECT USING (supplier_id IN (SELECT id FROM public.suppliers WHERE auth_id = auth.uid()));
CREATE POLICY "Admins can read all products" ON public.products
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.suppliers WHERE auth_id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "Suppliers can insert own products" ON public.products
  FOR INSERT WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE auth_id = auth.uid()));
CREATE POLICY "Suppliers can update own products" ON public.products
  FOR UPDATE USING (supplier_id IN (SELECT id FROM public.suppliers WHERE auth_id = auth.uid()));
CREATE POLICY "Admins can update all products" ON public.products
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.suppliers WHERE auth_id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.suppliers WHERE auth_id = auth.uid() AND is_admin = TRUE));

-- 7. STORAGE BUCKET FOR PRODUCT IMAGES
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: suppliers can upload to their own folder, public can read
CREATE POLICY "Public can read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. HELPER: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- DONE! After running this, copy your project URL and anon key
-- from Supabase Dashboard > Settings > API
-- ============================================
