-- Add indexes used by date-range reports, shift history, and debt summaries.
CREATE INDEX "customers_store_id_current_debt_idx" ON "customers"("store_id", "current_debt");
CREATE INDEX "shifts_store_id_opened_at_idx" ON "shifts"("store_id", "opened_at");
CREATE INDEX "sales_store_id_completed_at_idx" ON "sales"("store_id", "completed_at");
CREATE INDEX "payments_store_id_created_at_idx" ON "payments"("store_id", "created_at");
CREATE INDEX "restock_orders_store_id_created_at_idx" ON "restock_orders"("store_id", "created_at");
