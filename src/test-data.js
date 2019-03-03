/**
 * Insert test data to database.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')

logger.info('Insert test data into database.')

const insertData = async () => {
  const settings = []
  for (let i = 1; i <= 5; i++) {
    const setting = { id: `11ab038e-48da-123b-96e8-8d3b99b6d18${i}`, name: `setting-name-${i}` }
    settings.push(setting)
    await helper.create('ChallengeSetting', setting)
  }
  const types = []
  for (let i = 1; i <= 5; i++) {
    const type = { id: `fe6d0a58-ce7d-4521-8501-b8132b1c039${i}`, name: `type-name-${i}`, isActive: i <= 3 }
    if (i % 2 === 1) {
      type.description = `descritpion${i}`
    }
    types.push(type)
    await helper.create('ChallengeType', type)
  }
  const challenges = []
  for (let i = 0; i < 10; i++) {
    const challenge = {
      id: `071cd9fa-99d1-4733-8d27-3b745b2bc6be${i}`,
      legacyId: 30080001 + i,
      typeId: types[i % 5].id,
      track: `track${i}`,
      name: `test-name${i}`,
      description: `desc-${i % 5}`,
      challengeSettings: [],
      created: new Date(),
      createdBy: 'hohosky'
    }
    let j = i % 3
    while (j < 5) {
      challenge.challengeSettings.push({ type: settings[j].id, value: `test-value${i}${j}` })
      j = j + 3
    }
    challenges.push(challenge)
    await helper.create('Challenge', challenge)
  }
}

insertData().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
