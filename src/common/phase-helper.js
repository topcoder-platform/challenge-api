const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const {
  DomainHelper: { getLookupCriteria, getScanCriteria },
} = require("@topcoder-framework/lib-common");

const { PhaseDomain, TimelineTemplateDomain } = require("@topcoder-framework/domain-challenge");

const _ = require("lodash");

const uuid = require("uuid/v4");
const moment = require("moment");

const errors = require("./errors");

const phaseService = require("../services/PhaseService");
const timelineTemplateService = require("../services/TimelineTemplateService");

const phaseDomain = new PhaseDomain(GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT);

class ChallengePhaseHelper {
  /**
   * Populate challenge phases.
   * @param {Array} phases the phases to populate
   * @param {Date} startDate the challenge start date
   * @param {String} timelineTemplateId the timeline template id
   */
  async populatePhases(phases, startDate, timelineTemplateId) {
    if (_.isUndefined(timelineTemplateId)) {
      throw new errors.BadRequestError(`Invalid timeline template ID: ${timelineTemplateId}`);
    }

    const { timelineTempate, timelineTemplateMap } = await this.getTemplateAndTemplateMap(
      timelineTemplateId
    );
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();

    if (!phases || phases.length === 0) {
      // auto populate phases
      for (const p of timelineTempate) {
        phases.push({ ...p });
      }
    }

    for (const p of phases) {
      const phaseDefinition = phaseDefinitionMap.get(p.phaseId);

      // TODO: move to domain-challenge
      p.id = uuid();
      p.name = phaseDefinition.name;
      p.description = phaseDefinition.description;

      // set p.open based on current phase
      const phaseTemplate = timelineTemplateMap.get(p.phaseId);
      if (phaseTemplate) {
        if (!p.duration) {
          p.duration = phaseTemplate.defaultDuration;
        }

        if (phaseTemplate.predecessor) {
          const predecessor = _.find(phases, {
            phaseId: phaseTemplate.predecessor,
          });
          if (!predecessor) {
            throw new errors.BadRequestError(
              `Predecessor ${phaseTemplate.predecessor} not found in given phases.`
            );
          }
          p.predecessor = phaseTemplate.predecessor;
          console.log("Setting predecessor", p.predecessor, "for phase", p.phaseId);
        }
      }
    }

    // calculate dates
    if (!startDate) {
      return;
    }

    // sort phases by predecessor
    phases.sort((a, b) => {
      if (a.predecessor === b.phaseId) {
        return 1;
      }
      if (b.predecessor === a.phaseId) {
        return -1;
      }
      return 0;
    });

    let isSubmissionPhaseOpen = false;

    for (let p of phases) {
      const predecessor = timelineTemplateMap.get(p.predecessor);

      if (predecessor == null) {
        if (p.name === "Registration") {
          p.scheduledStartDate = moment(startDate).toDate();
        }
        if (p.name === "Submission") {
          p.scheduledStartDate = moment(startDate).add(5, "minutes").toDate();
        }

        if (moment(p.scheduledStartDate).isSameOrBefore(moment())) {
          p.actualStartDate = p.scheduledStartDate;
        } else {
          delete p.actualStartDate;
        }

        p.scheduledEndDate = moment(p.scheduledStartDate).add(p.duration, "seconds").toDate();
        if (moment(p.scheduledEndDate).isBefore(moment())) {
          delete p.actualEndDate;
        } else {
          p.actualEndDate = p.scheduledEndDate;
        }
      } else {
        const precedecessorPhase = _.find(phases, {
          phaseId: predecessor.phaseId,
        });
        if (precedecessorPhase == null) {
          throw new errors.BadRequestError(
            `Predecessor ${predecessor.phaseId} not found in given phases.`
          );
        }
        let phaseEndDate = moment(precedecessorPhase.scheduledEndDate);
        if (
          precedecessorPhase.actualEndDate != null &&
          moment(precedecessorPhase.actualEndDate).isAfter(phaseEndDate)
        ) {
          phaseEndDate = moment(precedecessorPhase.actualEndDate);
        } else {
          phaseEndDate = moment(precedecessorPhase.scheduledEndDate);
        }

        p.scheduledStartDate = phaseEndDate.toDate();
        p.scheduledEndDate = moment(p.scheduledStartDate).add(p.duration, "seconds").toDate();
      }
      p.isOpen = moment().isBetween(p.scheduledStartDate, p.scheduledEndDate);
      if (p.isOpen) {
        if (p.name === "Submission") {
          isSubmissionPhaseOpen = true;
        }
        delete p.actualEndDate;
      }

      if (moment(p.scheduledStartDate).isAfter(moment())) {
        delete p.actualStartDate;
        delete p.actualEndDate;
      }

      if (p.name === "Post-Mortem" && isSubmissionPhaseOpen) {
        delete p.actualStartDate;
        delete p.actualEndDate;
        p.isOpen = false;
      }

      if (p.constraints == null) {
        p.constraints = [];
      }
    }
  }

  async populatePhasesForChallengeCreation(phases, startDate, timelineTemplateId) {
    if (_.isUndefined(timelineTemplateId)) {
      throw new errors.BadRequestError(`Invalid timeline template ID: ${timelineTemplateId}`);
    }
    const { timelineTempate } = await this.getTemplateAndTemplateMap(timelineTemplateId);
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();
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
      if (_.isUndefined(phase.predecessor)) {
        if (_.isUndefined(_.get(phaseFromInput, "scheduledStartDate"))) {
          phase.scheduledStartDate = moment(startDate).toDate().toISOString();
        } else {
          phase.scheduledStartDate = moment(_.get(phaseFromInput, "scheduledStartDate"))
            .toDate()
            .toISOString();
        }
        phase.scheduledEndDate = moment(phase.scheduledStartDate)
          .add(phase.duration, "seconds")
          .toDate()
          .toISOString();
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
    return finalPhases;
  }

  async populatePhasesForChallengeUpdate(
    challengePhases,
    newPhases,
    timelineTemplateId,
    isBeingActivated
  ) {
    const { timelineTempate, timelineTemplateMap } = await this.getTemplateAndTemplateMap(
      timelineTemplateId
    );
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap();
    const updatedRegistrationPhase = undefined;
    const updatedPhases = _.map(challengePhases, (phase) => {
      const phaseFromTemplate = timelineTemplateMap.get(phase.phaseId);
      const phaseDefinition = phaseDefinitionMap.get(phase.phaseId);
      const updatedPhase = {
        ...phase,
        predecessor: phaseFromTemplate && phaseFromTemplate.predecessor,
        description: phaseDefinition.description,
      };
      if (updatedPhase.name === "Post-Mortem") {
        updatedPhase.predecessor = "a93544bc-c165-4af4-b55e-18f3593b457a";
      }
      if (updatedPhase.name === "Registration") {
        updatedRegistrationPhase = updatedPhase;
      }
      if (!_.isUndefined(phase.actualEndDate)) {
        return updatedPhase;
      }
      if (updatedPhase.name === "Iterative Review") {
        return updatedPhase;
      }
      const newPhase = _.find(newPhases, (p) => p.phaseId === updatedPhase.phaseId);
      if (_.isUndefined(newPhase) && !isBeingActivated) {
        return updatedPhase;
      }
      updatedPhase.duration = _.defaultTo(_.get(newPhase, "duration"), updatedPhase.duration);
      if (_.isUndefined(updatedPhase.predecessor)) {
        const finalScheduledStartDate = _.defaultTo(
          _.get(newPhase, "scheduledStartDate"),
          updatedPhase.scheduledStartDate
        );
        if (
          updatedPhase.name === "Submission" &&
          moment(finalScheduledStartDate).isBefore(
            moment(updatedRegistrationPhase && updatedRegistrationPhase.scheduledStartDate)
          )
        ) {
          finalScheduledStartDate = updatedRegistrationPhase.scheduledStartDate;
        }
        if (isBeingActivated && moment(finalScheduledStartDate).isSameOrBefore(moment())) {
          updatedPhase.isOpen = true;
          updatedPhase.scheduledStartDate = moment().toDate().toISOString();
          updatedPhase.actualStartDate = updatedPhase.scheduledStartDate;
        } else if (updatedPhase.isOpen === false) {
          updatedPhase.scheduledStartDate = moment(finalScheduledStartDate).toDate().toISOString();
        }
        updatedPhase.scheduledEndDate = moment(updatedPhase.scheduledStartDate)
          .add(updatedPhase.duration, "seconds")
          .toDate()
          .toISOString();
      }
      if (!_.isUndefined(newPhase) && !_.isUndefined(newPhase.constraints)) {
        updatedPhase.constraints = newPhase.constraints;
      }
      if (updatedPhase.name === "Registration") {
        updatedRegistrationPhase = updatedPhase;
      }
      return updatedPhase;
    });
    let lastIterative = undefined;
    for (let phase of updatedPhases) {
      if (_.isUndefined(phase.predecessor)) {
        continue;
      }
      let predecessorPhase = undefined;
      if (phase.name === "Iterative Review") {
        if (!_.isUndefined(lastIterative)) {
          predecessorPhase = lastIterative;
        } else {
          predecessorPhase = _.find(updatedPhases, {
            phaseId: phase.predecessor,
          });
        }
      } else {
        predecessorPhase = _.find(updatedPhases, {
          phaseId: phase.predecessor,
        });
      }
      phase.scheduledStartDate = predecessorPhase.scheduledEndDate;
      phase.scheduledEndDate = moment(phase.scheduledStartDate)
        .add(phase.duration, "seconds")
        .toDate()
        .toISOString();
      if (phase.name === "Iterative Review") {
        lastIterative = phase;
      }
    }
    return updatedPhases;
  }

  async validatePhases(phases) {
    if (!phases || phases.length === 0) {
      return;
    }
    const { items: records } = await phaseDomain.scan({ criteria: getScanCriteria({}) });
    const map = new Map();
    _.each(records, (r) => {
      map.set(r.id, r);
    });
    const invalidPhases = _.filter(phases, (p) => !map.has(p.phaseId));
    if (invalidPhases.length > 0) {
      throw new errors.BadRequestError(
        `The following phases are invalid: ${toString(invalidPhases)}`
      );
    }
  }

  async getPhaseDefinitionsAndMap() {
    const { result: records } = await phaseService.searchPhases();

    const map = new Map();
    _.each(records, (r) => {
      map.set(r.id, r);
    });
    return { phaseDefinitions: records, phaseDefinitionMap: map };
  }

  async getTemplateAndTemplateMap(timelineTemplateId) {
    const records = await timelineTemplateService.getTimelineTemplate(timelineTemplateId);

    const map = new Map();
    _.each(records.phases, (r) => {
      map.set(r.phaseId, r);
    });

    return {
      timelineTempate: records.phases,
      timelineTemplateMap: map,
    };
  }
}

module.exports = new ChallengePhaseHelper();
