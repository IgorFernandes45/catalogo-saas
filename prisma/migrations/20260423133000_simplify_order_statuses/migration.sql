-- Simplifica o fluxo de pedidos para apenas VENDIDO ou CANCELADO.
CREATE TYPE "OrderStatus_new" AS ENUM ('SOLD', 'CANCELLED');

ALTER TABLE "Order"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus_new"
USING (
  CASE
    WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'SOLD'
  END
)::"OrderStatus_new";

DROP TYPE "OrderStatus";

ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'SOLD';
