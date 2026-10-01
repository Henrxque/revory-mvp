CREATE TABLE "ai_integrity_scan_orders" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL, "offerVersion" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "checkoutDriver" TEXT NOT NULL,
  "stripeCheckoutSessionId" TEXT, "stripePaymentIntentId" TEXT, "checkoutUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paidAt" TIMESTAMP(3),
  CONSTRAINT "ai_integrity_scan_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_scan_order_status_check" CHECK ("status" IN ('PENDING','PAID','FAILED','EXPIRED','REFUNDED')),
  CONSTRAINT "ai_scan_order_amount_check" CHECK ("amountMinor" > 0),
  CONSTRAINT "ai_scan_order_driver_check" CHECK ("checkoutDriver" IN ('stripe-test','simulation'))
);
CREATE UNIQUE INDEX "ai_integrity_scan_orders_workspaceId_id_key" ON "ai_integrity_scan_orders"("workspaceId", "id");
CREATE UNIQUE INDEX "ai_integrity_scan_orders_workspaceId_requestKey_key" ON "ai_integrity_scan_orders"("workspaceId", "requestKey");
CREATE UNIQUE INDEX "ai_integrity_scan_orders_stripeCheckoutSessionId_key" ON "ai_integrity_scan_orders"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "ai_integrity_scan_orders_stripePaymentIntentId_key" ON "ai_integrity_scan_orders"("stripePaymentIntentId");
CREATE INDEX "ai_integrity_scan_orders_workspaceId_status_createdAt_idx" ON "ai_integrity_scan_orders"("workspaceId", "status", "createdAt");
ALTER TABLE "ai_integrity_scan_orders" ADD CONSTRAINT "ai_integrity_scan_orders_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "ai_integrity_scan_grants" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3), "consumedSnapshotId" TEXT,
  CONSTRAINT "ai_integrity_scan_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_scan_grant_status_check" CHECK ("status" IN ('ACTIVE','REVOKED'))
);
CREATE UNIQUE INDEX "ai_integrity_scan_grants_orderId_key" ON "ai_integrity_scan_grants"("orderId");
CREATE UNIQUE INDEX "ai_integrity_scan_grants_workspaceId_orderId_key" ON "ai_integrity_scan_grants"("workspaceId", "orderId");
CREATE UNIQUE INDEX "ai_integrity_scan_grants_workspaceId_id_key" ON "ai_integrity_scan_grants"("workspaceId", "id");
CREATE INDEX "ai_integrity_scan_grants_workspaceId_status_consumedAt_idx" ON "ai_integrity_scan_grants"("workspaceId", "status", "consumedAt");
ALTER TABLE "ai_integrity_scan_grants" ADD CONSTRAINT "ai_integrity_scan_grants_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_integrity_scan_grants" ADD CONSTRAINT "ai_integrity_scan_grants_workspaceId_orderId_fkey"
  FOREIGN KEY ("workspaceId", "orderId") REFERENCES "ai_integrity_scan_orders"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_integrity_scan_grants" ADD CONSTRAINT "ai_integrity_scan_grants_workspaceId_consumedSnapshotId_fkey"
  FOREIGN KEY ("workspaceId", "consumedSnapshotId") REFERENCES "ai_integrity_snapshots"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
