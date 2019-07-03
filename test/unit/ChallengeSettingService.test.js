/*
 * Unit tests of challenge setting service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/ChallengeSettingService')

const should = chai.should()

describe('challenge setting service unit tests', () => {
  // created entity ids
  let id
  let id2
  // random names
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const notFoundId = uuid()

  describe('create challenge setting tests', () => {
    it('create challenge setting successfully 1', async () => {
      const result = await service.createChallengeSetting({
        name
      })
      should.equal(result.name, name)
      should.exist(result.id)
      id = result.id
    })

    it('create challenge setting successfully 2', async () => {
      const result = await service.createChallengeSetting({
        name: name2
      })
      should.equal(result.name, name2)
      should.exist(result.id)
      id2 = result.id
    })

    it('create challenge setting - name already used', async () => {
      try {
        await service.createChallengeSetting({
          name
        })
      } catch (e) {
        should.equal(e.message, `ChallengeSetting with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge setting - missing name', async () => {
      try {
        await service.createChallengeSetting({
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge setting - invalid name', async () => {
      try {
        await service.createChallengeSetting({
          name: ['xx']
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge setting - unexpected field', async () => {
      try {
        await service.createChallengeSetting({
          name: 'some name',
          other: 123
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get challenge setting tests', () => {
    it('get challenge setting successfully', async () => {
      const result = await service.getChallengeSetting(id2)
      should.equal(result.id, id2)
      should.equal(result.name, name2)
    })

    it('get challenge setting - not found', async () => {
      try {
        await service.getChallengeSetting(notFoundId)
      } catch (e) {
        should.equal(e.message, `ChallengeSetting with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get challenge setting - invalid id', async () => {
      try {
        await service.getChallengeSetting('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search challenge settings tests', () => {
    it('search challenge settings successfully 1', async () => {
      const result = await service.searchChallengeSettings({ page: 1, perPage: 10, name: name2.substring(1).toUpperCase() })
      should.equal(result.total, 1)
      should.equal(result.page, 1)
      should.equal(result.perPage, 10)
      should.equal(result.result.length, 1)
      should.equal(result.result[0].id, id2)
      should.equal(result.result[0].name, name2)
    })

    it('search challenge settings successfully 2', async () => {
      const result = await service.searchChallengeSettings({ name: 'xyzxyz123' })
      should.equal(result.total, 0)
      should.equal(result.page, 1)
      should.equal(result.perPage, 20)
      should.equal(result.result.length, 0)
    })

    it('search challenge settings - invalid name', async () => {
      try {
        await service.searchChallengeSettings({ name: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge settings - invalid page', async () => {
      try {
        await service.searchChallengeSettings({ page: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge settings - invalid perPage', async () => {
      try {
        await service.searchChallengeSettings({ perPage: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge settings - unexpected field', async () => {
      try {
        await service.searchChallengeSettings({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update challenge setting tests', () => {
    it('fully update challenge setting successfully', async () => {
      const result = await service.updateChallengeSetting(id2, {
        name: `${name2}-updated`
      })
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-updated`)
    })

    it('fully update challenge setting - name already used', async () => {
      try {
        await service.updateChallengeSetting(id2, {
          name
        })
      } catch (e) {
        should.equal(e.message, `ChallengeSetting with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge setting - not found', async () => {
      try {
        await service.updateChallengeSetting(notFoundId, {
          name: 'slkdjflskjdf'
        })
      } catch (e) {
        should.equal(e.message, `ChallengeSetting with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge setting - invalid id', async () => {
      try {
        await service.updateChallengeSetting('invalid', {
          name: 'slkdjflskjdf'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge setting - null name', async () => {
      try {
        await service.updateChallengeSetting(id, {
          name: null
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge setting - invalid name', async () => {
      try {
        await service.updateChallengeSetting(id, {
          name: { invalid: 'x' }
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge setting - empty name', async () => {
      try {
        await service.updateChallengeSetting(id, {
          name: ''
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
