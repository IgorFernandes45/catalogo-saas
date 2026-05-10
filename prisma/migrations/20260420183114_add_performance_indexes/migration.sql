-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Category_storeId_isActive_sortOrder_idx" ON "Category"("storeId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "CategoryCustomAttribute_categoryId_idx" ON "CategoryCustomAttribute"("categoryId");

-- CreateIndex
CREATE INDEX "Order_storeId_status_idx" ON "Order"("storeId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Product_storeId_isActive_idx" ON "Product"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "ProductCustomAttributeValue_attributeId_idx" ON "ProductCustomAttributeValue"("attributeId");

-- CreateIndex
CREATE INDEX "User_storeId_role_idx" ON "User"("storeId", "role");
