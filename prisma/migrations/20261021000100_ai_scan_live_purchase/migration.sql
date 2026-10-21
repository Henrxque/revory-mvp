-- Expand the driver contract without changing existing orders or grants.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "ai_integrity_scan_orders" DROP CONSTRAINT "ai_scan_order_driver_check";
ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_scan_order_driver_check"
  CHECK (("status" = 'SYNTHETIC_PREVIEW' AND "checkoutDriver" = 'synthetic-preview')
    OR ("status" <> 'SYNTHETIC_PREVIEW' AND "checkoutDriver" IN ('stripe-test','simulation','stripe-live')));
ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_scan_order_live_offer_check"
  CHECK ("checkoutDriver" <> 'stripe-live' OR ("offerVersion" = 'revory-integrity-scan-99/v1' AND "amountMinor" = 9900 AND "currency" = 'usd'));
COMMIT;
