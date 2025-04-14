/**
 * Insert seed data to tables in database
 */
const _ = require('lodash');
const util = require('util')
const uuid = require('uuid/v4')
const logger = require('../common/logger')
const prismaHelper = require("../common/prisma-helper");

logger.info('Requesting to insert seed data to the tables...')

const { getClient } = require('../common/prisma')

const prisma = getClient()

async function importModel (filename, model) {
  const data = require(`./seed/${filename}.json`)
  await model.createMany({ data })
  logger.info(`Importing ${filename} complete`)
}

async function importTimelineTemplate () {
  const data = require('./seed/TimelineTemplate.json')
  let allPhases = []
  data.forEach(d => {
    const phases = d.phases
    delete d.phases
    phases.forEach(p => {
      p.timelineTemplateId = d.id
      Object.assign(p, {
        createdAt: '2025-03-10T13:08:02.378Z',
        createdBy: 'topcoder user',
        updatedAt: '2025-03-10T13:08:02.378Z',
        updatedBy: 'topcoder user'
      })
    })
    allPhases = allPhases.concat(phases)
  })
  await prisma.timelineTemplate.createMany({ data })
  logger.info('Importing TimelineTemplate complete')
  await prisma.timelineTemplatePhase.createMany({ data: allPhases })
  logger.info('Importing TimelineTemplatePhase complete')
}

async function importChallenge () {
  await prisma.challenge.deleteMany()
  const data = require('./seed/Challenge.json')
  let prismaData = _.map(data, d => {
    return prismaHelper.convertChallengeSchemaToPrisma({userId: 'topcoder user'}, d);
  });
  for (let d of prismaData) {
    await prisma.challenge.create({data: d})
  }
}

async function main () {
  await importModel('ChallengeTrack', prisma.challengeTrack)
  await importModel('ChallengeType', prisma.challengeType)
  await importModel('Phase', prisma.phase)
  await importTimelineTemplate()
  await importModel('ChallengeTimelineTemplate', prisma.challengeTimelineTemplate)
  await importChallenge()
}

main().then(() => {
  logger.info('All tables have been inserted with the data. The processes is run asynchronously')
  process.exit(0)
}).catch(err => {
  logger.logFullError(err)
  process.exit(1)
})
