-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "weekKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'checkbox',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "goalId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_weekKey_idx" ON "Goal"("weekKey");

-- CreateIndex
CREATE INDEX "SubItem_goalId_idx" ON "SubItem"("goalId");

-- CreateIndex
CREATE INDEX "SubItem_parentId_idx" ON "SubItem"("parentId");

-- AddForeignKey
ALTER TABLE "SubItem" ADD CONSTRAINT "SubItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubItem" ADD CONSTRAINT "SubItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SubItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
