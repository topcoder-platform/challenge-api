const challengeTypeService = require("../services/ChallengeTypeService");
const challengeTrackService = require("../services/ChallengeTrackService");
const timelineTemplateService = require("../services/TimelineTemplateService");

class ChallengeHelper {
  /**
   * @param {Object} challenge the challenge object
   * @returns {Promise<{trackId, typeId}>} the challenge track and type ids
   */
  async validateAndGetChallengeTypeAndTrack({
    typeId,
    trackId,
    timelineTemplateId,
  }) {
    let challengeType;
    if (typeId) {
      challengeType = await challengeTypeService.getChallengeType(typeId);
    }

    let challengeTrack;
    if (trackId) {
      challengeTrack = await challengeTrackService.getChallengeTrack(trackId);
    }

    if (timelineTemplateId) {
      const template = await timelineTemplateService.getTimelineTemplate(
        timelineTemplateId
      );

      if (!template.isActive) {
        throw new errors.BadRequestError(
          `The timeline template with id: ${challenge.timelineTemplateId} is inactive`
        );
      }
    }

    return { type: challengeType, track: challengeTrack };
  }
}

module.exports = new ChallengeHelper();
