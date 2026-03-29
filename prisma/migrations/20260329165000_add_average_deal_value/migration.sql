-- Add average deal value to activation setups for Seller setup.
ALTER TABLE "activation_setups"
ADD COLUMN "averageDealValue" DECIMAL(10, 2);
