const _ = require('lodash')
const uuid = require('uuid/v4')
const moment = require('moment')

const errors = require('./errors')
const helper = require('./helper')

class ChallengePhaseHelper {
  /**
   * Populate challenge phases.
   * @param {Array} phases the phases to populate
   * @param {Date} startDate the challenge start date
   * @param {String} timelineTemplateId the timeline template id
   */
  async populatePhases (phases, startDate, timelineTemplateId) {
    console.log('populatePhases', phases, startDate, timelineTemplateId)
    if (_.isUndefined(timelineTemplateId)) {
      throw new errors.BadRequestError(`Invalid timeline template ID: ${timelineTemplateId}`)
    }

    const { timelineTempate, timelineTemplateMap } = await this.getTemplateAndTemplateMap(timelineTemplateId)
    const { phaseDefinitionMap } = await this.getPhaseDefinitionsAndMap()

    if (!phases || phases.length === 0) {
      // auto populate phases
      for (const p of timelineTempate) {
        phases.push({ ...p })
      }
    }

    for (const p of phases) {
      const phaseDefinition = phaseDefinitionMap.get(p.phaseId)

      p.id = uuid()
      p.name = phaseDefinition.name
      p.description = phaseDefinition.description

      // set p.open based on current phase
      const phaseTemplate = timelineTemplateMap.get(p.phaseId)
      if (phaseTemplate) {
        if (!p.duration) {
          p.duration = phaseTemplate.defaultDuration
        }

        if (phaseTemplate.predecessor) {
          const predecessor = _.find(phases, { phaseId: phaseTemplate.predecessor })
          if (!predecessor) {
            throw new errors.BadRequestError(`Predecessor ${phaseTemplate.predecessor} not found in given phases.`)
          }
          p.predecessor = phaseTemplate.predecessor
          console.log('Setting predecessor', p.predecessor, 'for phase', p.phaseId)
        }
      }
    }

    // calculate dates
    if (!startDate) {
      return
    }

    // sort phases by predecessor
    phases.sort((a, b) => {
      if (a.predecessor === b.phaseId) {
        return 1
      }
      if (b.predecessor === a.phaseId) {
        return -1
      }
      return 0
    })

    let isSubmissionPhaseOpen = false
    let postMortemPhaseIndex = -1

    for (let p of phases) {
      const predecessor = timelineTemplateMap.get(p.predecessor)

      if (predecessor == null) {
        p.scheduledStartDate = startDate
        // p.actualStartDate = startDate

        p.scheduledEndDate = moment(p.actualStartDate != null ? p.actaulStartDate : startDate).add(p.duration, 'seconds').toDate()
      } else {
        const precedecessorPhase = _.find(phases, { phaseId: predecessor.phaseId })
        if (precedecessorPhase == null) {
          throw new errors.BadRequestError(`Predecessor ${predecessor.phaseId} not found in given phases.`)
        }
        let phaseEndDate = moment(precedecessorPhase.scheduledEndDate)
        if (precedecessorPhase.actualEndDate != null && moment(precedecessorPhase.actualEndDate).isAfter(phaseEndDate)) {
          phaseEndDate = moment(precedecessorPhase.actualEndDate)
        } else {
          phaseEndDate = moment(precedecessorPhase.scheduledEndDate)
        }

        p.scheduledStartDate = phaseEndDate.toDate()
        p.scheduledEndDate = moment(p.scheduledStartDate).add(p.duration, 'seconds').toDate()
      }
      p.isOpen = moment().isBetween(p.scheduledStartDate, p.scheduledEndDate)
      if (p.name === 'Submission') {
        isSubmissionPhaseOpen = p.isOpen
      }
      if (p.name === 'Post-Mortem') {
        postMortemPhaseIndex = _.findIndex(phases, { phaseId: p.phaseId })
      }
    }

    // if submission phase is open, remove post-mortem phase
    if (isSubmissionPhaseOpen && postMortemPhaseIndex > -1) {
      phases.splice(postMortemPhaseIndex, 1)
    }

    // phases.sort((a, b) => moment(a.scheduledStartDate).isAfter(b.scheduledStartDate))
  }

  async validatePhases (phases) {
    if (!phases || phases.length === 0) {
      return
    }
    const records = await helper.scan('Phase')
    const map = new Map()
    _.each(records, (r) => {
      map.set(r.id, r)
    })
    const invalidPhases = _.filter(phases, (p) => !map.has(p.phaseId))
    if (invalidPhases.length > 0) {
      throw new errors.BadRequestError(
        `The following phases are invalid: ${toString(invalidPhases)}`
      )
    }
  }

  async getPhaseDefinitionsAndMap () {
    const records = await helper.scan('Phase')
    const map = new Map()
    _.each(records, (r) => {
      map.set(r.id, r)
    })
    return { phaseDefinitions: records, phaseDefinitionMap: map }
  }

  async getTemplateAndTemplateMap (timelineTemplateId) {
    const records = await helper.getById('TimelineTemplate', timelineTemplateId)
    const map = new Map()
    _.each(records.phases, (r) => {
      map.set(r.phaseId, r)
    })

    return {
      timelineTempate: records.phases,
      timelineTemplateMap: map
    }
  }
}

module.exports = new ChallengePhaseHelper()
