-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INDIVIDUAL', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ProVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProActivity" AS ENUM ('WATCHMAKER', 'JEWELER', 'DEALER', 'AUCTION_HOUSE', 'PRE_OWNED_MARKET', 'EXPERT', 'INSURER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'INFO_REQUESTED', 'REJECTED', 'RECOVERED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('POLICE_REPORT', 'PURCHASE_INVOICE', 'OWNERSHIP_PROOF', 'BUSINESS_REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('MESSAGE', 'INFO_REQUEST', 'STATUS_CHANGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('STRIPE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SearchType" AS ENUM ('SERIAL', 'ADVANCED');

-- CreateEnum
CREATE TYPE "MatchReportContext" AS ENUM ('PURCHASE_OFFER', 'TRADE_IN', 'REPAIR', 'APPRAISAL', 'CONSIGNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'OWNER_NOTIFIED', 'TRANSMITTED_TO_AUTHORITIES', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('ADMIN', 'SECURITY', 'ACCESS', 'BILLING', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'DELETION');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerTier" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "suspendedReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "vatNumber" TEXT,
    "activity" "ProActivity" NOT NULL,
    "activityOther" TEXT,
    "addressLine" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "verificationStatus" "ProVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watches" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "brandNormalized" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelNormalized" TEXT NOT NULL,
    "reference" TEXT,
    "referenceNormalized" TEXT,
    "serialNumber" TEXT,
    "serialNormalized" TEXT,
    "yearApprox" INTEGER,
    "caseMaterial" TEXT,
    "caseSizeMm" INTEGER,
    "dialColor" TEXT,
    "strap" TEXT,
    "distinctiveMarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theft_reports" (
    "id" TEXT NOT NULL,
    "publicRef" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "watchId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "theftDate" TIMESTAMP(3) NOT NULL,
    "theftCity" TEXT NOT NULL,
    "theftCountry" TEXT NOT NULL,
    "circumstances" TEXT,
    "privateDescription" TEXT,
    "policeReportFiled" BOOLEAN NOT NULL DEFAULT false,
    "policeReportNumber" TEXT,
    "policeService" TEXT,
    "ownerCertifiedAt" TIMESTAMP(3) NOT NULL,
    "statusReason" TEXT,
    "adminNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "recoveredAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theft_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_images" (
    "id" TEXT NOT NULL,
    "watchId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visibleToProfessionals" BOOLEAN NOT NULL DEFAULT true,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_documents" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "theftReportId" TEXT,
    "professionalProfileId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_messages" (
    "id" TEXT NOT NULL,
    "theftReportId" TEXT NOT NULL,
    "authorId" TEXT,
    "kind" "MessageKind" NOT NULL DEFAULT 'MESSAGE',
    "body" TEXT NOT NULL,
    "fromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoKey" TEXT,
    "logoMimeType" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "specialties" TEXT[],
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationCriteria" JSONB NOT NULL DEFAULT '{}',
    "verificationNotes" TEXT,
    "tier" "PartnerTier" NOT NULL DEFAULT 'STANDARD',
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsoredUntil" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "professionalProfileId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "interval" "BillingInterval" NOT NULL,
    "stripePriceId" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "planId" TEXT,
    "source" "SubscriptionSource" NOT NULL DEFAULT 'STRIPE',
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalProfileId" TEXT,
    "type" "SearchType" NOT NULL,
    "criteria" JSONB NOT NULL,
    "serialNormalized" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "matchedReportIds" TEXT[],
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theftReportId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "potential_match_reports" (
    "id" TEXT NOT NULL,
    "theftReportId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "professionalProfileId" TEXT,
    "context" "MatchReportContext" NOT NULL,
    "message" TEXT NOT NULL,
    "observedSerial" TEXT,
    "location" TEXT,
    "status" "MatchReportStatus" NOT NULL DEFAULT 'OPEN',
    "adminNotes" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "potential_match_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_type_idx" ON "auth_tokens"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_userId_key" ON "professional_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_stripeCustomerId_key" ON "professional_profiles"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "professional_profiles_verificationStatus_idx" ON "professional_profiles"("verificationStatus");

-- CreateIndex
CREATE INDEX "watches_serialNormalized_idx" ON "watches"("serialNormalized");

-- CreateIndex
CREATE INDEX "watches_brandNormalized_modelNormalized_idx" ON "watches"("brandNormalized", "modelNormalized");

-- CreateIndex
CREATE INDEX "watches_referenceNormalized_idx" ON "watches"("referenceNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "theft_reports_publicRef_key" ON "theft_reports"("publicRef");

-- CreateIndex
CREATE UNIQUE INDEX "theft_reports_watchId_key" ON "theft_reports"("watchId");

-- CreateIndex
CREATE INDEX "theft_reports_status_createdAt_idx" ON "theft_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "theft_reports_ownerId_idx" ON "theft_reports"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_images_storageKey_key" ON "watch_images"("storageKey");

-- CreateIndex
CREATE INDEX "watch_images_watchId_position_idx" ON "watch_images"("watchId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "private_documents_storageKey_key" ON "private_documents"("storageKey");

-- CreateIndex
CREATE INDEX "private_documents_theftReportId_idx" ON "private_documents"("theftReportId");

-- CreateIndex
CREATE INDEX "private_documents_professionalProfileId_idx" ON "private_documents"("professionalProfileId");

-- CreateIndex
CREATE INDEX "report_messages_theftReportId_createdAt_idx" ON "report_messages"("theftReportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "partners_professionalProfileId_key" ON "partners"("professionalProfileId");

-- CreateIndex
CREATE INDEX "partners_isPublished_country_city_idx" ON "partners"("isPublished", "country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripePriceId_key" ON "plans"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_professionalProfileId_status_idx" ON "subscriptions"("professionalProfileId", "status");

-- CreateIndex
CREATE INDEX "professional_searches_userId_createdAt_idx" ON "professional_searches"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "professional_searches_flagged_createdAt_idx" ON "professional_searches"("flagged", "createdAt");

-- CreateIndex
CREATE INDEX "professional_searches_createdAt_idx" ON "professional_searches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_theftReportId_key" ON "bookmarks"("userId", "theftReportId");

-- CreateIndex
CREATE INDEX "potential_match_reports_status_createdAt_idx" ON "potential_match_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "potential_match_reports_reporterId_idx" ON "potential_match_reports"("reporterId");

-- CreateIndex
CREATE INDEX "audit_logs_category_createdAt_idx" ON "audit_logs"("category", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_windowStart_idx" ON "rate_limit_buckets"("windowStart");

-- CreateIndex
CREATE INDEX "data_requests_status_createdAt_idx" ON "data_requests"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theft_reports" ADD CONSTRAINT "theft_reports_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theft_reports" ADD CONSTRAINT "theft_reports_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theft_reports" ADD CONSTRAINT "theft_reports_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "watches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_images" ADD CONSTRAINT "watch_images_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "watches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_documents" ADD CONSTRAINT "private_documents_theftReportId_fkey" FOREIGN KEY ("theftReportId") REFERENCES "theft_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_documents" ADD CONSTRAINT "private_documents_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_documents" ADD CONSTRAINT "private_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_messages" ADD CONSTRAINT "report_messages_theftReportId_fkey" FOREIGN KEY ("theftReportId") REFERENCES "theft_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_messages" ADD CONSTRAINT "report_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_searches" ADD CONSTRAINT "professional_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_searches" ADD CONSTRAINT "professional_searches_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_theftReportId_fkey" FOREIGN KEY ("theftReportId") REFERENCES "theft_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "potential_match_reports" ADD CONSTRAINT "potential_match_reports_theftReportId_fkey" FOREIGN KEY ("theftReportId") REFERENCES "theft_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "potential_match_reports" ADD CONSTRAINT "potential_match_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "potential_match_reports" ADD CONSTRAINT "potential_match_reports_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "potential_match_reports" ADD CONSTRAINT "potential_match_reports_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

