const _ = require("lodash");

const uuid = require("uuid/v4");
const moment = require("moment");

const errors = require("./errors");

const timelineTemplateService = require("../services/TimelineTemplateService");
const prisma = require('../common/prisma').getClient()

class ChallengePhaseHelper {
  phaseDefinitionMap = {};
  timelineTemplateMap = {};

  async populatePhasesForChallengeCreation(phases, startDate, timelineTemplateId) {
    if (_.isUndefined(timelineTemplateId)) {
      throw new errors.BadRequestError(`Invalid timeline template ID: ${timelineTemplateId}`);
    }
    const { timelineTempate } = await this.getTemplateAndTemplateMap(timelineTemplateId);
    console.log("Selected timeline template", JSON.stringify(timelineTempate));
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();
    let fixedStartDate = undefined;
    const finalPhases = _.map(timelineTempate, (phaseFromTemplate) => {
      const phaseDefinition = phaseDefinitionMap.get(phaseFromTemplate.phaseId);
      const phaseFromInput = _.find(phases, (p) => p.phaseId === phaseFromTemplate.phaseId);
      const phase = {
        id: uuid(),
        phaseId: phaseFromTemplate.phaseId,
        name: phaseDefinition.name,
        description: phaseDefinition.description,
        duration: _.defaultTo(_.get(phaseFromInput, "duration"), phaseFromTemplate.defaultDuration),
        isOpen: false,
        predecessor: phaseFromTemplate.predecessor,
        constraints: _.defaultTo(_.get(phaseFromInput, "constraints"), []),
        scheduledStartDate: undefined,
        scheduledEndDate: undefined,
        actualStartDate: undefined,
        actualEndDate: undefined,
      };
      if (_.isNil(phase.predecessor)) {
        let scheduledStartDate = _.defaultTo(
          _.get(phaseFromInput, "scheduledStartDate"),
          startDate
        );
        if (
          !_.isUndefined(fixedStartDate) &&
          moment(scheduledStartDate).isSameOrBefore(moment(fixedStartDate))
        ) {
          scheduledStartDate = moment(fixedStartDate).add(5, "minutes").toDate().toISOString();
        }
        phase.scheduledStartDate = moment(scheduledStartDate).toDate().toISOString();
        phase.scheduledEndDate = moment(phase.scheduledStartDate)
          .add(phase.duration, "seconds")
          .toDate()
          .toISOString();
      }
      if (_.isUndefined(fixedStartDate)) {
        fixedStartDate = phase.scheduledStartDate;
      }
      return phase;
    });
    for (let phase of finalPhases) {
      if (_.isUndefined(phase.predecessor)) {
        continue;
      }
      const precedecessorPhase = _.find(finalPhases, {
        phaseId: phase.predecessor,
      });
      if (!_.isNil(precedecessorPhase)) {
        if (phase.name === "Iterative Review") {
          phase.scheduledStartDate = precedecessorPhase.scheduledStartDate;
        } else {
          phase.scheduledStartDate = precedecessorPhase.scheduledEndDate;
        }
        phase.scheduledEndDate = moment(phase.scheduledStartDate)
          .add(phase.duration, "seconds")
          .toDate()
          .toISOString();
      }
    }
    return finalPhases;
  }

  async populatePhasesForChallengeUpdate(
    challengePhases,
    newPhases,
    timelineTemplateId,
    isBeingActivated
  ) {
    const { timelineTemplateMap } = await this.getTemplateAndTemplateMap(timelineTemplateId);
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();
    let fixedStartDate = undefined;
    const updatedPhases = _.map(challengePhases, (phase) => {
      const phaseFromTemplate = timelineTemplateMap.get(phase.phaseId);
      const phaseDefinition = phaseDefinitionMap.get(phase.phaseId);
      const newPhase = _.find(newPhases, (p) => p.phaseId === phase.phaseId);
      const updatedPhase = {
        ...phase,
        predecessor: phaseFromTemplate && phaseFromTemplate.predecessor,
        description: phaseDefinition.description,
      };
      if (updatedPhase.name === "Post-Mortem") {
        updatedPhase.predecessor = "a93544bc-c165-4af4-b55e-18f3593b457a";
      }
      if (_.isNil(updatedPhase.actualEndDate)) {
        updatedPhase.duration = _.defaultTo(_.get(newPhase, "duration"), updatedPhase.duration);
      }
      if (_.isNil(updatedPhase.predecessor)) {
        let scheduledStartDate = _.defaultTo(
          _.get(newPhase, "scheduledStartDate"),
          updatedPhase.scheduledStartDate
        );
        if (
          !_.isNil(fixedStartDate) &&
          moment(scheduledStartDate).isSameOrBefore(moment(fixedStartDate))
        ) {
          scheduledStartDate = moment(fixedStartDate).add(5, "minutes").toDate().toISOString();
        }
        if (isBeingActivated && moment(scheduledStartDate).isSameOrBefore(moment())) {
          updatedPhase.isOpen = true;
          updatedPhase.scheduledStartDate = moment().toDate().toISOString();
          updatedPhase.actualStartDate = updatedPhase.scheduledStartDate;
        } else if (_.isNil(phase.actualStartDate)) {
          updatedPhase.scheduledStartDate = moment(scheduledStartDate).toDate().toISOString();
        }
        updatedPhase.scheduledEndDate = moment(updatedPhase.scheduledStartDate)
          .add(updatedPhase.duration, "seconds")
          .toDate()
          .toISOString();
      }
      if (
        _.isNil(phase.actualEndDate) &&
        !_.isNil(newPhase) &&
        !_.isNil(newPhase.constraints)
      ) {
        updatedPhase.constraints = newPhase.constraints;
      }
      if (_.isNil(fixedStartDate)) {
        fixedStartDate = updatedPhase.scheduledStartDate;
      }
      return updatedPhase;
    });
    let iterativeReviewSet = false;
    for (let phase of updatedPhases) {
      if (_.isNil(phase.predecessor)) {
        continue;
      }
      const predecessorPhase = _.find(updatedPhases, {
        phaseId: phase.predecessor,
      });
      if (phase.name === "Iterative Review") {
        if (!iterativeReviewSet) {
          if (_.isNil(phase.actualStartDate)) {
            phase.scheduledStartDate = predecessorPhase.scheduledStartDate;
          }
          iterativeReviewSet = true;
        }
      } else if (_.isNil(phase.actualStartDate)) {
        phase.scheduledStartDate = predecessorPhase.scheduledEndDate;
      }
      if (_.isNil(phase.actualEndDate)) {
        phase.scheduledEndDate = moment(phase.scheduledStartDate)
          .add(phase.duration, "seconds")
          .toDate()
          .toISOString();
      }
    }
    return updatedPhases;
  }

  handlePhasesAfterCancelling(phases) {
    return _.map(phases, (phase) => {
      const shouldClosePhase = _.includes(
        ["Registration", "Submission", "Checkpoint Submission"],
        phase.name
      );
      return {
        ...phase,
        isOpen: shouldClosePhase ? false : phase.isOpen,
        actualEndDate: shouldClosePhase ? moment().toDate().toISOString() : phase.actualEndDate,
      };
    });
  }

  async validatePhases(phases) {
    if (!phases || phases.length === 0) {
      return;
    }
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();
    const invalidPhases = _.filter(phases, (p) => !phaseDefinitionMap.has(p.phaseId));
    if (invalidPhases.length > 0) {
      throw new errors.BadRequestError(
        `The following phases are invalid: ${toString(invalidPhases)}`
      );
    }
  }

  async getPhase(phaseId) {
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();
    return phaseDefinitionMap.get(phaseId);
  }

  async getPhaseDefinitionsAndMap() {
    if (_.isEmpty(this.phaseDefinitionMap)) {
      const records = await prisma.phase.findMany({})

      const map = new Map();
      _.each(records, (r) => {
        map.set(r.id, r);
      });

      this.phaseDefinitionMap = { phaseDefinitions: records, phaseDefinitionMap: map };
    }
    return this.phaseDefinitionMap;
  }

  async getTemplateAndTemplateMap(timelineTemplateId) {
    if (_.isEmpty(this.timelineTemplateMap[timelineTemplateId])) {
      const records = await timelineTemplateService.getTimelineTemplate(timelineTemplateId);
      const map = new Map();
      _.each(records.phases, (r) => {
        map.set(r.phaseId, r);
      });

      this.timelineTemplateMap[timelineTemplateId] = {
        timelineTempate: records.phases,
        timelineTemplateMap: map,
      };
    }
    return this.timelineTemplateMap[timelineTemplateId];
  }
}

module.exports = new ChallengePhaseHelper();
