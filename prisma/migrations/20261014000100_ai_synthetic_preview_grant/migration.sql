ALTER TABLE "ai_integrity_scan_orders" DROP CONSTRAINT "ai_scan_order_status_check";
ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_scan_order_status_check"
  CHECK ("status" IN ('PENDING','PAID','FAILED','EXPIRED','REFUNDED','SYNTHETIC_PREVIEW'));

ALTER TABLE "ai_integrity_scan_orders" DROP CONSTRAINT "ai_scan_order_amount_check";
ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_scan_order_amount_check"
  CHECK (("status" = 'SYNTHETIC_PREVIEW' AND "amountMinor" = 0)
    OR ("status" <> 'SYNTHETIC_PREVIEW' AND "amountMinor" > 0));

ALTER TABLE "ai_integrity_scan_orders" DROP CONSTRAINT "ai_scan_order_driver_check";
ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_scan_order_driver_check"
  CHECK (("status" = 'SYNTHETIC_PREVIEW' AND "checkoutDriver" = 'synthetic-preview')
    OR ("status" <> 'SYNTHETIC_PREVIEW' AND "checkoutDriver" IN ('stripe-test','simulation')));

ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_scan_order_synthetic_preview_shape_check"
  CHECK ("status" <> 'SYNTHETIC_PREVIEW' OR (
    "stripeCheckoutSessionId" IS NULL
    AND "stripePaymentIntentId" IS NULL
    AND "checkoutUrl" IS NULL
    AND "paidAt" IS NULL
  ));
