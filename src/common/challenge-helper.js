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
  async ensureProjectExist(projectId, currentUser) {
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
  }

  async validateChallengeUpdateRequest(currentUser, challenge, data) {
    await helper.ensureUserCanModifyChallenge(currentUser, challenge);

    helper.ensureNoDuplicateOrNullElements(data.tags, "tags");
    helper.ensureNoDuplicateOrNullElements(data.groups, "groups");

    if (data.projectId) {
      await ensureProjectExist(data.projectId, currentUser);
    }

    // check groups access to be updated group values
    if (data.groups) {
      await ensureAcessibilityToModifiedGroups(currentUser, data, challenge);
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
  }
}

module.exports = new ChallengeHelper();
