DROP POLICY IF EXISTS "Authenticated users can view filters" ON public.filters;

CREATE POLICY "Users can view own filters"
ON public.filters
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));