-- Reconcile the public Academy and Marketplace catalog contracts used by the
-- hosted development preview. This migration is intentionally idempotent
-- because older environments may already contain the historical Academy CMS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'academy_content_status'
  ) THEN
    CREATE TYPE public.academy_content_status AS ENUM ('draft', 'published');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.academy_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text,
  description text,
  body text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  thumbnail_url text,
  banner_url text,
  video_url text,
  video_file_name text,
  video_mime_type text,
  video_size bigint,
  status public.academy_content_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.academy_content_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.academy_contents(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_contents_public_catalog_idx
  ON public.academy_contents (status, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS academy_content_attachments_content_idx
  ON public.academy_content_attachments (content_id);

DROP TRIGGER IF EXISTS update_academy_contents_updated_at ON public.academy_contents;
CREATE TRIGGER update_academy_contents_updated_at
  BEFORE UPDATE ON public.academy_contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.academy_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_content_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published academy content is publicly visible" ON public.academy_contents;
DROP POLICY IF EXISTS "Staff can manage academy content" ON public.academy_contents;
DROP POLICY IF EXISTS academy_contents_anon_read ON public.academy_contents;
DROP POLICY IF EXISTS academy_contents_authenticated_read ON public.academy_contents;
DROP POLICY IF EXISTS academy_contents_staff_insert ON public.academy_contents;
DROP POLICY IF EXISTS academy_contents_staff_update ON public.academy_contents;
DROP POLICY IF EXISTS academy_contents_staff_delete ON public.academy_contents;

CREATE POLICY academy_contents_anon_read
  ON public.academy_contents
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY academy_contents_authenticated_read
  ON public.academy_contents
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_platform_staff());

CREATE POLICY academy_contents_staff_insert
  ON public.academy_contents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());

CREATE POLICY academy_contents_staff_update
  ON public.academy_contents
  FOR UPDATE TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());

CREATE POLICY academy_contents_staff_delete
  ON public.academy_contents
  FOR DELETE TO authenticated
  USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Published academy content attachments are publicly visible" ON public.academy_content_attachments;
DROP POLICY IF EXISTS "Staff can manage academy content attachments" ON public.academy_content_attachments;
DROP POLICY IF EXISTS academy_content_attachments_anon_read ON public.academy_content_attachments;
DROP POLICY IF EXISTS academy_content_attachments_authenticated_read ON public.academy_content_attachments;
DROP POLICY IF EXISTS academy_content_attachments_staff_insert ON public.academy_content_attachments;
DROP POLICY IF EXISTS academy_content_attachments_staff_update ON public.academy_content_attachments;
DROP POLICY IF EXISTS academy_content_attachments_staff_delete ON public.academy_content_attachments;

CREATE POLICY academy_content_attachments_anon_read
  ON public.academy_content_attachments
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.academy_contents content
      WHERE content.id = academy_content_attachments.content_id
        AND content.status = 'published'
    )
  );

CREATE POLICY academy_content_attachments_authenticated_read
  ON public.academy_content_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_platform_staff()
    OR EXISTS (
      SELECT 1
      FROM public.academy_contents content
      WHERE content.id = academy_content_attachments.content_id
        AND content.status = 'published'
    )
  );

CREATE POLICY academy_content_attachments_staff_insert
  ON public.academy_content_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());

CREATE POLICY academy_content_attachments_staff_update
  ON public.academy_content_attachments
  FOR UPDATE TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());

CREATE POLICY academy_content_attachments_staff_delete
  ON public.academy_content_attachments
  FOR DELETE TO authenticated
  USING (public.is_platform_staff());

REVOKE ALL ON TABLE public.academy_contents FROM anon, authenticated;
REVOKE ALL ON TABLE public.academy_content_attachments FROM anon, authenticated;
GRANT SELECT ON TABLE public.academy_contents, public.academy_content_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.academy_contents, public.academy_content_attachments TO authenticated;
GRANT USAGE ON TYPE public.academy_content_status TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('academy-videos', 'academy-videos', true, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]),
  ('academy-images', 'academy-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('academy-materials', 'academy-materials', true, 104857600, ARRAY[
    'application/pdf',
    'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read published academy storage assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload academy storage assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update academy storage assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete academy storage assets" ON storage.objects;
DROP POLICY IF EXISTS academy_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS academy_storage_staff_insert ON storage.objects;
DROP POLICY IF EXISTS academy_storage_staff_update ON storage.objects;
DROP POLICY IF EXISTS academy_storage_staff_delete ON storage.objects;

CREATE POLICY academy_storage_public_read
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('academy-videos', 'academy-images', 'academy-materials'));

CREATE POLICY academy_storage_staff_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('academy-videos', 'academy-images', 'academy-materials')
    AND public.is_platform_staff()
  );

CREATE POLICY academy_storage_staff_update
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('academy-videos', 'academy-images', 'academy-materials')
    AND public.is_platform_staff()
  )
  WITH CHECK (
    bucket_id IN ('academy-videos', 'academy-images', 'academy-materials')
    AND public.is_platform_staff()
  );

CREATE POLICY academy_storage_staff_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('academy-videos', 'academy-images', 'academy-materials')
    AND public.is_platform_staff()
  );

-- Keep anonymous catalog policies free of staff-only predicates. PostgreSQL
-- validates function execution privileges even when another OR branch would
-- make the staff predicate unnecessary for published rows.
DROP POLICY IF EXISTS "Published seller products are public" ON public.seller_products;
DROP POLICY IF EXISTS "Sellers view own products" ON public.seller_products;
DROP POLICY IF EXISTS seller_products_public_read ON public.seller_products;
DROP POLICY IF EXISTS seller_products_owner_staff_read ON public.seller_products;
DROP POLICY IF EXISTS seller_products_anon_read ON public.seller_products;
DROP POLICY IF EXISTS seller_products_authenticated_read ON public.seller_products;

CREATE POLICY seller_products_anon_read
  ON public.seller_products
  FOR SELECT TO anon
  USING (status = 'published' OR is_demo = true);

CREATE POLICY seller_products_authenticated_read
  ON public.seller_products
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR is_demo = true
    OR seller_id = (SELECT auth.uid())
    OR public.is_platform_staff()
  );

DROP POLICY IF EXISTS "Paid buyers view product file metadata" ON public.seller_product_files;
DROP POLICY IF EXISTS "Sellers manage own product files" ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_demo_read ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_owner_read ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_public_read ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_anon_read ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_authenticated_read ON public.seller_product_files;

CREATE POLICY seller_product_files_anon_read
  ON public.seller_product_files
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.seller_products product
      WHERE product.id = seller_product_files.product_id
        AND (product.status = 'published' OR product.is_demo = true)
    )
  );

CREATE POLICY seller_product_files_authenticated_read
  ON public.seller_product_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seller_products product
      WHERE product.id = seller_product_files.product_id
        AND (
          product.status = 'published'
          OR product.is_demo = true
          OR product.seller_id = (SELECT auth.uid())
          OR public.is_platform_staff()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.digital_product_order_items item
      JOIN public.digital_product_orders purchase ON purchase.id = item.order_id
      WHERE item.product_id = seller_product_files.product_id
        AND purchase.buyer_id = (SELECT auth.uid())
        AND purchase.status = 'paid'
    )
  );

GRANT SELECT ON TABLE public.seller_products, public.seller_product_files TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
