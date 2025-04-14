-- CreateEnum
CREATE TYPE "ChallengeTrackEnum" AS ENUM ('DEVELOP', 'DESIGN', 'DATA_SCIENCE', 'QA');

-- CreateEnum
CREATE TYPE "ReviewTypeEnum" AS ENUM ('COMMUNITY', 'INTERNAL');

-- CreateEnum
CREATE TYPE "DiscussionTypeEnum" AS ENUM ('CHALLENGE');

-- CreateEnum
CREATE TYPE "ChallengeStatusEnum" AS ENUM ('NEW', 'DRAFT', 'APPROVED', 'ACTIVE', 'COMPLETED', 'DELETED', 'CANCELLED', 'CANCELLED_FAILED_REVIEW', 'CANCELLED_FAILED_SCREENING', 'CANCELLED_ZERO_SUBMISSIONS', 'CANCELLED_WINNER_UNRESPONSIVE', 'CANCELLED_CLIENT_REQUEST', 'CANCELLED_REQUIREMENTS_INFEASIBLE', 'CANCELLED_ZERO_REGISTRATIONS', 'CANCELLED_PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "PrizeSetTypeEnum" AS ENUM ('PLACEMENT', 'COPILOT', 'REVIEWER', 'CHECKPOINT');

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "privateDescription" TEXT,
    "descriptionFormat" TEXT,
    "projectId" INTEGER,
    "typeId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "timelineTemplateId" TEXT,
    "overviewTotalPrizes" DOUBLE PRECISION,
    "currentPhaseNames" TEXT[],
    "tags" TEXT[],
    "groups" TEXT[],
    "taskIsTask" BOOLEAN NOT NULL DEFAULT false,
    "taskIsAssigned" BOOLEAN NOT NULL DEFAULT false,
    "taskMemberId" TEXT,
    "submissionStartDate" TIMESTAMP(3),
    "submissionEndDate" TIMESTAMP(3),
    "registrationStartDate" TIMESTAMP(3),
    "registrationEndDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "legacyId" INTEGER,
    "status" "ChallengeStatusEnum" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTask" BOOLEAN NOT NULL DEFAULT false,
    "abbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeTrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "legacyId" INTEGER,
    "track" "ChallengeTrackEnum",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeTimelineTemplate" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "timelineTemplateId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeTimelineTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "memberId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeMetadata" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "prizeSetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeWinner" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "handle" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "type" "PrizeSetTypeEnum" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeTerm" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeSkill" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeBilling" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT,
    "markup" DOUBLE PRECISION,
    "clientBillingRate" DOUBLE PRECISION,
    "challengeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeLegacy" (
    "id" TEXT NOT NULL,
    "reviewType" "ReviewTypeEnum" NOT NULL DEFAULT 'INTERNAL',
    "confidentialityType" TEXT NOT NULL DEFAULT 'public',
    "forumId" INTEGER,
    "directProjectId" INTEGER,
    "screeningScorecardId" INTEGER,
    "reviewScorecardId" INTEGER,
    "isTask" BOOLEAN NOT NULL DEFAULT false,
    "useSchedulingAPI" BOOLEAN NOT NULL DEFAULT false,
    "pureV5Task" BOOLEAN NOT NULL DEFAULT false,
    "pureV5" BOOLEAN NOT NULL DEFAULT false,
    "selfService" BOOLEAN NOT NULL DEFAULT false,
    "selfServiceCopilot" TEXT,
    "track" TEXT,
    "subTrack" TEXT,
    "legacySystemId" INTEGER,
    "challengeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeLegacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeEvent" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT,
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeDiscussion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "discussionId" TEXT,
    "name" TEXT NOT NULL,
    "type" "DiscussionTypeEnum" NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeDiscussionOption" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "optionValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeDiscussionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeConstraint" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "allowedRegistrants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengeConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isOpen" BOOLEAN NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengePhase" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isOpen" BOOLEAN DEFAULT false,
    "predecessor" TEXT,
    "duration" INTEGER,
    "scheduledStartDate" TIMESTAMP(3),
    "scheduledEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengePhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengePhaseConstraint" (
    "id" TEXT NOT NULL,
    "challengePhaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengePhaseConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengePrizeSet" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "type" "PrizeSetTypeEnum" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ChallengePrizeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "TimelineTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineTemplatePhase" (
    "id" TEXT NOT NULL,
    "timelineTemplateId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "predecessor" TEXT,
    "defaultDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "TimelineTemplatePhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_projectId_idx" ON "Challenge"("projectId");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "ChallengeType_abbreviation_idx" ON "ChallengeType"("abbreviation");

-- CreateIndex
CREATE INDEX "ChallengeTrack_legacyId_idx" ON "ChallengeTrack"("legacyId");

-- CreateIndex
CREATE INDEX "ChallengeTimelineTemplate_typeId_trackId_timelineTemplateId_idx" ON "ChallengeTimelineTemplate"("typeId", "trackId", "timelineTemplateId");

-- CreateIndex
CREATE INDEX "AuditLog_challengeId_idx" ON "AuditLog"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeMetadata_challengeId_idx" ON "ChallengeMetadata"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeWinner_challengeId_idx" ON "ChallengeWinner"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeBilling_challengeId_key" ON "ChallengeBilling"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeLegacy_challengeId_key" ON "ChallengeLegacy"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeEvent_challengeId_idx" ON "ChallengeEvent"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeDiscussion_challengeId_idx" ON "ChallengeDiscussion"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeConstraint_challengeId_key" ON "ChallengeConstraint"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "Phase_name_key" ON "Phase"("name");

-- CreateIndex
CREATE INDEX "ChallengePhase_challengeId_idx" ON "ChallengePhase"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengePhaseConstraint_challengePhaseId_idx" ON "ChallengePhaseConstraint"("challengePhaseId");

-- CreateIndex
CREATE INDEX "ChallengePrizeSet_challengeId_idx" ON "ChallengePrizeSet"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineTemplate_name_key" ON "TimelineTemplate"("name");

-- CreateIndex
CREATE INDEX "TimelineTemplatePhase_timelineTemplateId_idx" ON "TimelineTemplatePhase"("timelineTemplateId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ChallengeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ChallengeTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_timelineTemplateId_fkey" FOREIGN KEY ("timelineTemplateId") REFERENCES "TimelineTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTimelineTemplate" ADD CONSTRAINT "ChallengeTimelineTemplate_timelineTemplateId_fkey" FOREIGN KEY ("timelineTemplateId") REFERENCES "TimelineTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTimelineTemplate" ADD CONSTRAINT "ChallengeTimelineTemplate_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ChallengeTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTimelineTemplate" ADD CONSTRAINT "ChallengeTimelineTemplate_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ChallengeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMetadata" ADD CONSTRAINT "ChallengeMetadata_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_prizeSetId_fkey" FOREIGN KEY ("prizeSetId") REFERENCES "ChallengePrizeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeWinner" ADD CONSTRAINT "ChallengeWinner_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTerm" ADD CONSTRAINT "ChallengeTerm_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSkill" ADD CONSTRAINT "ChallengeSkill_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeBilling" ADD CONSTRAINT "ChallengeBilling_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeLegacy" ADD CONSTRAINT "ChallengeLegacy_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEvent" ADD CONSTRAINT "ChallengeEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDiscussion" ADD CONSTRAINT "ChallengeDiscussion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDiscussionOption" ADD CONSTRAINT "ChallengeDiscussionOption_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "ChallengeDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeConstraint" ADD CONSTRAINT "ChallengeConstraint_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePhase" ADD CONSTRAINT "ChallengePhase_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePhase" ADD CONSTRAINT "ChallengePhase_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePhaseConstraint" ADD CONSTRAINT "ChallengePhaseConstraint_challengePhaseId_fkey" FOREIGN KEY ("challengePhaseId") REFERENCES "ChallengePhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePrizeSet" ADD CONSTRAINT "ChallengePrizeSet_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineTemplatePhase" ADD CONSTRAINT "TimelineTemplatePhase_timelineTemplateId_fkey" FOREIGN KEY ("timelineTemplateId") REFERENCES "TimelineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
