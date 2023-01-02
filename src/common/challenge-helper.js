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
    let challengeTrack;
    let timelineTemplate;

    if (typeId) {
      challengeType = await challengeTypeService.getChallengeType(typeId);
    }

    if (trackId) {
      challengeTrack = await challengeTrackService.getChallengeTrack(trackId);
    }
    if (timelineTemplateId) {
      timelineTemplate = await timelineTemplateService.getTimelineTemplate(
        timelineTemplateId
      );
    }
    if (challengeType && challengeTrack) {
      if (challengeType.track !== challengeTrack.track) {
        throw new Error(
          `Challenge type track ${challengeType.track} does not match challenge track ${challengeTrack.track}`
        );
      }
    }
    if (challengeType && timelineTemplate) {
      if (challengeType.track !== timelineTemplate.track) {
        throw new Error(
          `Challenge type track ${challengeType.track} does not match timeline template track ${timelineTemplate.track}`
        );
      }
    }
    if (challengeTrack && timelineTemplate) {
      if (challengeTrack.track !== timelineTemplate.track) {
        throw new Error(
          `Challenge track ${challengeTrack.track} does not match timeline template track ${timelineTemplate.track}`
        );
      }
    }
    return {
      typeId: challengeType ? challengeType.id : null,
      trackId: challengeTrack ? challengeTrack.id : null,
      timelineTemplateId: timelineTemplate ? timelineTemplate.id : null,
    };
  }
}

module.exports = new ChallengeHelper();
