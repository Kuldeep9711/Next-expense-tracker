/*
  Warnings:

  - You are about to drop the column `catogory` on the `Record` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `Record` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Record" DROP COLUMN "catogory",
DROP COLUMN "createAt",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
