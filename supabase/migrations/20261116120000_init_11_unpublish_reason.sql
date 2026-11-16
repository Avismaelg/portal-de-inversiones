-- Despublicar con motivo (instrumentos y subastas). Ver docs/sprint-1/PLAN-SPRINT-1.md §9.
ALTER TABLE public.financial_instruments
  ADD COLUMN unpublished_at timestamptz,
  ADD COLUMN unpublish_reason text,
  ADD CONSTRAINT financial_instruments_unpublish_reason_chk
    CHECK (unpublished_at IS NULL OR (unpublish_reason IS NOT NULL AND btrim(unpublish_reason) <> ''));

ALTER TABLE public.instrument_auctions
  ADD COLUMN unpublished_at timestamptz,
  ADD COLUMN unpublish_reason text,
  ADD CONSTRAINT instrument_auctions_unpublish_reason_chk
    CHECK (unpublished_at IS NULL OR (unpublish_reason IS NOT NULL AND btrim(unpublish_reason) <> ''));

GRANT UPDATE (unpublished_at, unpublish_reason) ON public.financial_instruments TO authenticated;
GRANT UPDATE (unpublished_at, unpublish_reason) ON public.instrument_auctions TO authenticated;
