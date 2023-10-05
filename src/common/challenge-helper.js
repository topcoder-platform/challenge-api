const challengeTypeService = require("../services/ChallengeTypeService");
const challengeTrackService = require("../services/ChallengeTrackService");
const timelineTemplateService = require("../services/TimelineTemplateService");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
const errors = require("./errors");
const config = require("config");
const helper = require("./helper");
const constants = require("../../app-constants");
const axios = require("axios");
const Decimal = require("decimal.js");
const { getM2MToken } = require("./m2m-helper");
const { hasAdminRole } = require("./role-helper");
const { ensureAcessibilityToModifiedGroups } = require("./group-helper");

class ChallengeHelper {
  /**
   * @param {Object} challenge the challenge object
   * @returns {Promise<{trackId, typeId}>} the challenge track and type ids
   */
  async validateAndGetChallengeTypeAndTrack({ typeId, trackId, timelineTemplateId }) {
    let challengeType;
    if (typeId) {
      challengeType = await challengeTypeService.getChallengeType(typeId);
    }

    let challengeTrack;
    if (trackId) {
      challengeTrack = await challengeTrackService.getChallengeTrack(trackId);
    }

    if (timelineTemplateId) {
      const template = await timelineTemplateService.getTimelineTemplate(timelineTemplateId);

      if (!template.isActive) {
        throw new errors.BadRequestError(
          `The timeline template with id: ${timelineTemplateId} is inactive`
        );
      }
    }

    return { type: challengeType, track: challengeTrack };
  }

  /**
   * Ensure project exist
   * @param {String} projectId the project id
   * @param {String} currentUser the user
   */
  static async ensureProjectExist(projectId, currentUser) {
    let token = await getM2MToken();
    const url = `${config.PROJECTS_API_URL}/${projectId}`;
    try {
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (currentUser.isMachine || hasAdminRole(currentUser)) {
        return res.data;
      }
      if (
        _.get(res, "data.type") === "self-service" &&
        _.includes(config.SELF_SERVICE_WHITELIST_HANDLES, currentUser.handle.toLowerCase())
      ) {
        return res.data;
      }
      if (
        !_.find(
          _.get(res, "data.members", []),
          (m) => _.toString(m.userId) === _.toString(currentUser.userId)
        )
      ) {
        throw new errors.ForbiddenError(`You don't have access to project with ID: ${projectId}`);
      }
      return res.data;
    } catch (err) {
      if (_.get(err, "response.status") === HttpStatus.NOT_FOUND) {
        throw new errors.BadRequestError(`Project with id: ${projectId} doesn't exist`);
      } else {
        // re-throw other error
        throw err;
      }
    }
  }

  async validateCreateChallengeRequest(currentUser, challenge) {
    // projectId is required for non self-service challenges
    if (challenge.legacy.selfService == null && challenge.projectId == null) {
      throw new errors.BadRequestError("projectId is required for non self-service challenges.");
    }

    if (challenge.status === constants.challengeStatuses.Active) {
      throw new errors.BadRequestError(
        "You cannot create an Active challenge. Please create a Draft challenge and then change the status to Active."
      );
    }

    helper.ensureNoDuplicateOrNullElements(challenge.tags, "tags");
    helper.ensureNoDuplicateOrNullElements(challenge.groups, "groups");
    // helper.ensureNoDuplicateOrNullElements(challenge.terms, 'terms')
    // helper.ensureNoDuplicateOrNullElements(challenge.events, 'events')

    // check groups authorization
    await helper.ensureAccessibleByGroupsAccess(currentUser, challenge);

    if (challenge.constraints) {
      await ChallengeHelper.validateChallengeConstraints(challenge.constraints);
    }
  }

  async validateChallengeUpdateRequest(currentUser, challenge, data, challengeResources) {
    if (process.env.LOCAL != "true") {
      await helper.ensureUserCanModifyChallenge(currentUser, challenge, challengeResources);
    }

    helper.ensureNoDuplicateOrNullElements(data.tags, "tags");
    helper.ensureNoDuplicateOrNullElements(data.groups, "groups");

    if (data.projectId) {
      await ChallengeHelper.ensureProjectExist(data.projectId, currentUser);
    }

    // check groups access to be updated group values
    if (data.groups) {
      await ensureAcessibilityToModifiedGroups(currentUser, data, challenge);
    }

    // Ensure descriptionFormat is either 'markdown' or 'html'
    if (data.descriptionFormat && !_.includes(["markdown", "html"], data.descriptionFormat)) {
      throw new errors.BadRequestError(
        "The property 'descriptionFormat' must be either 'markdown' or 'html'"
      );
    }

    // Ensure unchangeable fields are not changed
    if (
      _.get(challenge, "legacy.track") &&
      _.get(data, "legacy.track") &&
      _.get(challenge, "legacy.track") !== _.get(data, "legacy.track")
    ) {
      throw new errors.ForbiddenError("Cannot change legacy.track");
    }

    if (
      _.get(challenge, "trackId") &&
      _.get(data, "trackId") &&
      _.get(challenge, "trackId") !== _.get(data, "trackId")
    ) {
      throw new errors.ForbiddenError("Cannot change trackId");
    }

    if (
      _.get(challenge, "typeId") &&
      _.get(data, "typeId") &&
      _.get(challenge, "typeId") !== _.get(data, "typeId")
    ) {
      throw new errors.ForbiddenError("Cannot change typeId");
    }

    if (
      _.get(challenge, "legacy.pureV5Task") &&
      _.get(data, "legacy.pureV5Task") &&
      _.get(challenge, "legacy.pureV5Task") !== _.get(data, "legacy.pureV5Task")
    ) {
      throw new errors.ForbiddenError("Cannot change legacy.pureV5Task");
    }

    if (
      _.get(challenge, "legacy.pureV5") &&
      _.get(data, "legacy.pureV5") &&
      _.get(challenge, "legacy.pureV5") !== _.get(data, "legacy.pureV5")
    ) {
      throw new errors.ForbiddenError("Cannot change legacy.pureV5");
    }

    if (
      _.get(challenge, "legacy.selfService") &&
      _.get(data, "legacy.selfService") &&
      _.get(challenge, "legacy.selfService") !== _.get(data, "legacy.selfService")
    ) {
      throw new errors.ForbiddenError("Cannot change legacy.selfService");
    }

    if (
      (challenge.status === constants.challengeStatuses.Completed ||
        challenge.status === constants.challengeStatuses.Cancelled) &&
      data.status &&
      data.status !== challenge.status &&
      data.status !== constants.challengeStatuses.CancelledClientRequest
    ) {
      throw new errors.BadRequestError(
        `Cannot change ${challenge.status} challenge status to ${data.status} status`
      );
    }

    if (
      data.winners &&
      data.winners.length > 0 &&
      challenge.status !== constants.challengeStatuses.Completed &&
      data.status !== constants.challengeStatuses.Completed
    ) {
      throw new errors.BadRequestError(
        `Cannot set winners for challenge with non-completed ${challenge.status} status`
      );
    }

    if (data.constraints) {
      await ChallengeHelper.validateChallengeConstraints(data.constraints);
    }
  }

  static async validateChallengeConstraints(constraints) {
    if (!_.isEmpty(constraints.allowedRegistrants)) {
      await ChallengeHelper.validateAllowedRegistrants(constraints.allowedRegistrants);
    }
  }

  static async validateAllowedRegistrants(allowedRegistrants) {
    const members = await helper.getMembersByHandles(allowedRegistrants);
    const incorrectHandles = _.difference(
      allowedRegistrants,
      _.map(members, (m) => _.toLower(m.handle))
    );
    if (incorrectHandles.length > 0) {
      throw new errors.BadRequestError(
        `Cannot create challenge with invalid handle in constraints. [${_.join(
          incorrectHandles,
          ","
        )}]`
      );
    }
  }

  sanitizeRepeatedFieldsInUpdateRequest(data) {
    if (data.winners != null) {
      data.winnerUpdate = {
        winners: data.winners,
      };
      delete data.winners;
    }

    if (data.discussions != null) {
      data.discussionUpdate = {
        discussions: data.discussions,
      };
      delete data.discussions;
    }

    if (data.metadata != null) {
      data.metadataUpdate = {
        metadata: data.metadata,
      };
      delete data.metadata;
    }

    if (data.phases != null) {
      data.phaseUpdate = {
        phases: data.phases,
      };
      delete data.phases;
    }

    if (data.events != null) {
      data.eventUpdate = {
        events: data.events,
      };
      delete data.events;
    }

    if (data.terms != null) {
      data.termUpdate = {
        terms: data.terms,
      };
      delete data.terms;
    }

    if (data.prizeSets != null) {
      data.prizeSetUpdate = {
        prizeSets: data.prizeSets,
      };
      delete data.prizeSets;
    }

    if (data.tags != null) {
      data.tagUpdate = {
        tags: data.tags,
      };
      delete data.tags;
    }

    if (data.attachments != null) {
      data.attachmentUpdate = {
        attachments: data.attachments,
      };
      delete data.attachments;
    }

    if (data.groups != null) {
      data.groupUpdate = {
        groups: data.groups,
      };
      delete data.groups;
    }

    return data;
  }

  enrichChallengeForResponse(challenge, track, type) {
    if (challenge.phases && challenge.phases.length > 0) {
      const registrationPhase = _.find(challenge.phases, (p) => p.name === "Registration");
      const submissionPhase = _.find(challenge.phases, (p) => p.name === "Submission");

      challenge.currentPhase = challenge.phases
        .slice()
        .reverse()
        .find((phase) => phase.isOpen);

      challenge.currentPhaseNames = _.map(
        _.filter(challenge.phases, (p) => p.isOpen === true),
        "name"
      );

      if (registrationPhase) {
        challenge.registrationStartDate =
          registrationPhase.actualStartDate || registrationPhase.scheduledStartDate;
        challenge.registrationEndDate =
          registrationPhase.actualEndDate || registrationPhase.scheduledEndDate;
      }
      if (submissionPhase) {
        challenge.submissionStartDate =
          submissionPhase.actualStartDate || submissionPhase.scheduledStartDate;

        challenge.submissionEndDate =
          submissionPhase.actualEndDate || submissionPhase.scheduledEndDate;
      }
    }

    if (challenge.created)
      challenge.created = ChallengeHelper.convertDateToISOString(challenge.created);
    if (challenge.updated)
      challenge.updated = ChallengeHelper.convertDateToISOString(challenge.updated);
    if (challenge.startDate)
      challenge.startDate = ChallengeHelper.convertDateToISOString(challenge.startDate);
    if (challenge.endDate)
      challenge.endDate = ChallengeHelper.convertDateToISOString(challenge.endDate);

    if (track) {
      challenge.track = track.name;
    }

    if (type) {
      challenge.type = type.name;
    }

    challenge.metadata = challenge.metadata.map((m) => {
      try {
        m.value = JSON.stringify(JSON.parse(m.value)); // when we update how we index data, make this a JSON field
      } catch (err) {
        // do nothing
      }
      return m;
    });
  }

  static convertDateToISOString(startDate) {
    if (startDate instanceof Date) {
      return startDate.toISOString();
    }
    if (typeof startDate === "string" && !isNaN(startDate)) {
      startDate = parseInt(startDate);
    }
    if (typeof startDate === "number") {
      const date = new Date(startDate);
      return date.toISOString();
    } else {
      return startDate;
    }
  }

  convertToISOString(startDate) {
    return ChallengeHelper.convertDateToISOString(startDate);
  }

  convertPrizeSetValuesToCents(prizeSets) {
    prizeSets.forEach((prizeSet) => {
      prizeSet.prizes.forEach((prize) => {
        prize.amountInCents = new Decimal(prize.value).mul(100).toNumber();
        delete prize.value;
      });
    });
  }

  convertPrizeSetValuesToDollars(prizeSets, overview) {
    prizeSets.forEach((prizeSet) => {
      prizeSet.prizes.forEach((prize) => {
        if (prize.amountInCents != null) {
          prize.value = parseFloat(new Decimal(prize.amountInCents).div(100).toFixed(2));

          delete prize.amountInCents;
        }
      });
    });
    if (overview && !_.isUndefined(overview.totalPrizesInCents)) {
      overview.totalPrizes = parseFloat(
        new Decimal(overview.totalPrizesInCents).div(100).toFixed(2)
      );

      delete overview.totalPrizesInCents;
    }
  }
}

module.exports = new ChallengeHelper();
