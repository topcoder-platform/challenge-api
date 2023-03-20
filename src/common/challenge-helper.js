const challengeTypeService = require("../services/ChallengeTypeService");
const challengeTrackService = require("../services/ChallengeTrackService");
const timelineTemplateService = require("../services/TimelineTemplateService");
const errors = require("./errors");

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
}

module.exports = new ChallengeHelper();
