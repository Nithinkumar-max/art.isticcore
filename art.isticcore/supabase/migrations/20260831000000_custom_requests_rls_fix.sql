-- Migration: Fix RLS for custom_design_requests
-- Adds admin SELECT policy so the admin page can read all requests,
-- and an updated_at trigger for automatic timestamp updates.

-- 1. Enable RLS (already enabled, but safe to re-run)
ALTER TABLE public.custom_design_requests ENABLE ROW LEVEL SECURITY;

-- 2. Admin SELECT policy: admins can read all requests
CREATE POLICY "design_requests_select_admin"
  ON public.custom_design_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 3. Admin UPDATE policy: admins can update any request
CREATE POLICY "design_requests_update_admin"
  ON public.custom_design_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (true);

-- 4. Add updated_at trigger (missing from original schema)
CREATE OR REPLACE FUNCTION public.update_custom_design_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_custom_design_requests_updated_at
  BEFORE UPDATE ON public.custom_design_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_design_requests_updated_at();
