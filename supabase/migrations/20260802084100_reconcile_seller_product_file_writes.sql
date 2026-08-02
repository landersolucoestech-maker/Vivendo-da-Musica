-- Preserve authenticated seller/staff write access after consolidating public
-- file metadata read policies.

DROP POLICY IF EXISTS "Sellers manage own product files" ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_owner_insert ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_owner_update ON public.seller_product_files;
DROP POLICY IF EXISTS seller_product_files_owner_delete ON public.seller_product_files;

CREATE POLICY seller_product_files_owner_insert
  ON public.seller_product_files
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seller_products product
      WHERE product.id = seller_product_files.product_id
        AND (
          product.seller_id = (SELECT auth.uid())
          OR public.is_platform_staff()
        )
    )
  );

CREATE POLICY seller_product_files_owner_update
  ON public.seller_product_files
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seller_products product
      WHERE product.id = seller_product_files.product_id
        AND (
          product.seller_id = (SELECT auth.uid())
          OR public.is_platform_staff()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seller_products product
      WHERE product.id = seller_product_files.product_id
        AND (
          product.seller_id = (SELECT auth.uid())
          OR public.is_platform_staff()
        )
    )
  );

CREATE POLICY seller_product_files_owner_delete
  ON public.seller_product_files
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seller_products product
      WHERE product.id = seller_product_files.product_id
        AND (
          product.seller_id = (SELECT auth.uid())
          OR public.is_platform_staff()
        )
    )
  );

GRANT INSERT, UPDATE, DELETE ON TABLE public.seller_product_files TO authenticated;
