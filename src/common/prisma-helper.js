const _ = require('lodash');
const Decimal = require("decimal.js");
const constants = require('../../app-constants');

/**
 * Convert phases data to prisma model.
 *
 * @param {Object} challenge challenge data
 * @param {Object} result result
 * @param {Object} auditFields createdBy and updatedBy
 */
function convertChallengePhaseSchema(challenge, result, auditFields) {
  // keep phase data
  const phaseFields = ['name', 'description', 'isOpen', 'predecessor', 'duration',
    'scheduledStartDate', 'scheduledEndDate', 'actualStartDate', 'actualEndDate'];
  // current phase names
  result.currentPhaseNames = _.map(
    _.filter(challenge.phases, (p) => p.isOpen === true), "name"
  );
  // get registration date and submission date
  _.forEach(challenge.phases, p => {
    if (p.name === 'Registration') {
      result.registrationStartDate = p.actualStartDate || p.scheduledStartDate
      result.registrationEndDate = p.actualEndDate || p.scheduledEndDate
    } else if (p.name === 'Submission') {
      result.submissionStartDate = p.actualStartDate || p.scheduledStartDate
      result.submissionEndDate = p.actualEndDate || p.scheduledEndDate
    }
  })
  // set phases array data
  if (!_.isEmpty(challenge.phases)) {
    result.phases = {
      create: _.map(challenge.phases, p => {
        const phaseData = {
          phase: { connect: { id: p.phaseId } },
          ..._.pick(p, phaseFields),
          ...auditFields
        }
        if (!_.isEmpty(p.constraints)) {
          phaseData.constraints = { create: _.map(p.constraints, c => ({ ...c, ...auditFields })) }
        }
        return phaseData
      })
    }
  }
}

/**
 * Convert challenge data to prisma model.
 *
 * @param {Object} currentUser current user
 * @param {Object} challenge challenge schema
 * @returns prisma model data to create/update challenge
 */
function convertChallengeSchemaToPrisma(currentUser, challenge) {
  // used id used in createdBy and updatedBy
  const userId = _.toString(currentUser.userId)
  const auditFields = {
    createdBy: userId,
    updatedBy: userId
  }
  // keep primitive data
  const result = _.pick(challenge, [
    'name', 'description', 'privateDescription', 'descriptionFormat', 'tags', 'projectId',
    'startDate', 'groups', 'legacyId',
  ])
  // set legacy data
  if (!_.isNil(challenge.legacy)) {
    result.legacyRecord = {
      create: {
        ...challenge.legacy,
        ...auditFields
      }
    }
  }
  // set billing
  if (!_.isNil(challenge.billing)) {
    result.billingRecord = {
      create: {
        ...challenge.billing,
        ...auditFields
      }
    }
  }
  // set task
  if (!_.isNil(challenge.task)) {
    result.taskIsTask = _.get(challenge, 'task.isTask')
    result.taskIsAssigned = _.get(challenge, 'task.isAssigned')
    const taskMemberId = _.get(challenge, 'task.memberId', null);
    if (!_.isNil(taskMemberId)) {
      result.taskMemberId = String(taskMemberId)
    }
  }
  // set metadata
  if (!_.isNil(challenge.metadata)) {
    result.metadata = { create: _.map(challenge.metadata, m => ({ ...m, ...auditFields })) }
  }
  convertChallengePhaseSchema(challenge, result, auditFields)
  // set events
  if (!_.isNil(challenge.events)) {
    result.events = {
      create: _.map(challenge.events, e => {
        const ret = _.pick(e, ['name', 'key'])
        _.assignIn(ret, auditFields)
        ret.eventId = e.id
        return ret
      })
    }
  }
  // discussions
  if (!_.isNil(challenge.discussions)) {
    result.discussions = {
      create: _.map(challenge.discussions, d => {
        const dissData = _.pick(d, ['name', 'provider', 'url'])
        dissData.discussionId = d.id
        dissData.type = d.type.toUpperCase()
        _.assignIn(dissData, auditFields)
        if (!_.isEmpty(d.options)) {
          dissData.options = { create: [] }
          _.forEach(d.options, o => {
            _.forIn(o, (v, k) => {
              dissData.options.create.push({
                optionKey: k,
                optionValue: v,
                ...auditFields
              })
            })
          })
        }
        return dissData
      })
    }
  }
  let totalPrizesInCents = 0
  // prize sets
  if (!_.isNil(challenge.prizeSets)) {
    result.prizeSets = {
      create: _.map(challenge.prizeSets, s => {
        const setData = _.pick(s, 'description')
        setData.type = s.type.toUpperCase()
        _.assignIn(setData, auditFields)
        setData.prizes = {
          create: _.map(s.prizes, p => {
            const prizeData = _.pick(p, 'type', 'description')
            _.assignIn(prizeData, auditFields)
            prizeData.value = p.amountInCents || p.value
            // calculate only placement and checkpoint prizes
            if ((s.type === constants.prizeSetTypes.ChallengePrizes
              || s.type === constants.prizeSetTypes.CheckpointPrizes)
              && p.type === constants.prizeTypes.USD) {
              totalPrizesInCents += (p.amountInCents || new Decimal(p.value).mul(100).toNumber())
            }
            return prizeData
          })
        }
        return setData
      })
    }
    result.overviewTotalPrizes = parseFloat(new Decimal(totalPrizesInCents).div(100).toFixed(2))
  }
  // constraints
  if (!_.isNil(_.get(challenge, 'constraints.allowedRegistrants'))) {
    result.constraintRecord = {
      create: {
        allowedRegistrants: _.get(challenge, 'constraints.allowedRegistrants'),
        ...auditFields
      }
    }
  }
  // status
  if (challenge.status) {
    result.status = challenge.status.toUpperCase()
  }
  // terms
  if (!_.isNil(challenge.terms)) {
    result.terms = {
      create: _.map(challenge.terms, t => ({
        ...auditFields,
        roleId: t.roleId,
        termId: t.id
      }))
    }
  }
  // skills
  if (!_.isNil(challenge.skills)) {
    result.skills = {
      create: _.map(challenge.skills, s => ({
        ...auditFields,
        skillId: s.id
      }))
    }
  }
  // winners
  if (!_.isNil(challenge.winners)) {
    result.winners = {
      create: _.map(challenge.winners, w => {
        const t = {
          ...auditFields,
          ..._.pick(w, ['userId', 'handle', 'placement', 'type'])
        }
        if (_.isNil(t.type)) {
          t.type = constants.prizeSetTypes.ChallengePrizes.toUpperCase()
        } else {
          t.type = t.type.toUpperCase()
        }
        return t;
      })
    }
  }
  // relations
  if (challenge.typeId) {
    result.type = { connect: { id: challenge.typeId } }
  }
  if (challenge.trackId) {
    result.track = { connect: { id: challenge.trackId } }
  }
  if (challenge.timelineTemplateId) {
    result.timelineTemplate = { connect: { id: challenge.timelineTemplateId } }
  }
  _.assignIn(result, auditFields)
  // keep createdAt to allow test data
  if (challenge.created) {
    result.createdAt = challenge.created || new Date()
  }
  result.updatedAt = new Date()
  return result
}

/**
 * Convert prisma model to response data
 *
 * @param {Object} ret prisma model data
 * @returns response data
 */
function convertModelToResponse(ret) {
  ret.status = _.capitalize(ret.status.toLowerCase())
  ret.legacy = _.omit(ret.legacyRecord, 'id', constants.auditFields)
  delete ret.legacyRecord
  delete ret.legacy.challengeId
  // billing info is not returned in response
  // ret.billing = _.omit(ret.billingRecord, 'id', constants.auditFields)
  delete ret.billingRecord

  ret.task = {
    isTask: ret.taskIsTask,
    isAssigned: ret.taskIsAssigned,
    memberId: ret.taskMemberId
  }
  delete ret.taskIsTask
  delete ret.taskIsAssigned
  delete ret.taskMemberId

  // use original date field
  ret.created = ret.createdAt
  ret.updated = ret.updatedAt
  delete ret.createdAt
  delete ret.updatedAt

  // convert metadata
  ret.metadata = _.map(ret.metadata, m => _.pick(m, ['name', 'value']))
  // convert phases
  ret.phases = _.map(ret.phases, p => {
    const t = _.omit(p, 'challengeId', constants.auditFields)
    t.constraints = _.map(p.constraints, c => _.pick(c, 'name', 'value'))
    return t
  })
  // convert events
  ret.events = _.map(ret.events, e => ({ id: e.eventId, name: e.name, key: e.key }))
  // convert discussions
  ret.discussions = _.map(ret.discussions, d => {
    const r = _.pick(d, ['name', 'type', 'provider', 'url'])
    r.id = d.discussionId
    r.options = _.map(d.options, o => {
      const x = {}
      x[o.optionKey] = o.optionValue
      return x
    })
    return r
  })
  // convert prize sets
  let prizeType;
  ret.prizeSets = _.map(ret.prizeSets, s => {
    const ss = _.pick(s, ['type', 'description'])
    ss.type = ss.type.toLowerCase()
    ss.prizes = _.map(s.prizes, p => {
      prizeType = p.type
      if (prizeType === constants.prizeTypes.USD) {
        // convert cents to value
        p.value = parseFloat(new Decimal(p.value).div(100).toFixed(2))
      }
      return _.pick(p, ['type', 'description', 'value'])
    })
    return ss
  })
  ret.overview = { totalPrizes: ret.overviewTotalPrizes };
  if (prizeType) {
    ret.overview.type = prizeType;
  }
  delete ret.overviewTotalPrizes

  // convert terms
  ret.terms = _.map(ret.terms, t => ({ id: t.termId, roleId: t.roleId }))
  // convert skills
  ret.skills = _.map(ret.skills, s => ({ id: s.skillId, name: s.name }))
  // convert attachments
  ret.attachments = _.map(ret.attachments, r => _.omit(r, constants.auditFields, 'challengeId'))
  // convert winners
  ret.winners = _.map(ret.winners, w => {
    const winner = _.pick(w, ['userId', 'handle', 'placement'])
    winner.type = w.type.toLowerCase()
    return winner
  })
  // TODO: Set data from other API
  ret.numOfSubmissions = 0
  ret.numOfCheckpointSubmissions = 0
  ret.numOfRegistrants = 0
}

module.exports = {
  convertChallengePhaseSchema,
  convertChallengeSchemaToPrisma,
  convertModelToResponse,
};
