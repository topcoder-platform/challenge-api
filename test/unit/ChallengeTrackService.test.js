/*
 * Unit tests of challenge track service
 */

require('../../app-bootstrap')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/ChallengeTrackService')

const should = chai.should()

describe('challenge track service unit tests', () => {
  // created entity ids
  let id
  let id2
  // random values
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const abbreviation = `abb1${new Date().getTime()}`
  const abbreviation2 = `abb2${new Date().getTime()}`
  const notFoundId = uuid()

  describe('create challenge track tests', () => {
    it('create challenge track successfully 1', async () => {
      const result = await service.createChallengeTrack({
        name,
        description: 'desc',
        isActive: true,
        abbreviation
      })
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, true)
      should.equal(result.abbreviation, abbreviation)
      should.exist(result.id)
      id = result.id
    })

    it('create challenge track successfully 2', async () => {
      const result = await service.createChallengeTrack({
        name: name2,
        description: 'desc2',
        isActive: false,
        abbreviation: abbreviation2
      })
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isActive, false)
      should.equal(result.abbreviation, abbreviation2)
      should.exist(result.id)
      id2 = result.id
    })

    it('create challenge track - name already used', async () => {
      try {
        await service.createChallengeTrack({
          name,
          description: 'desc',
          isActive: false,
          abbreviation: 'abb987'
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge track - abbreviation already used', async () => {
      try {
        await service.createChallengeTrack({
          name: `name-abc-${new Date().getTime()}`,
          description: 'desc',
          isActive: false,
          abbreviation
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with abbreviation: ${abbreviation} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge track - missing name', async () => {
      try {
        await service.createChallengeTrack({
          description: 'desc',
          isActive: false,
          abbreviation: 'abb'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge track - missing abbreviation', async () => {
      try {
        await service.createChallengeTrack({
          name: 'nnnnn',
          description: 'desc',
          isActive: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"abbreviation" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge track - invalid name', async () => {
      try {
        await service.createChallengeTrack({
          name: ['xx'],
          description: 'desc',
          isActive: false,
          abbreviation: 'abb'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge track - invalid isActive', async () => {
      try {
        await service.createChallengeTrack({
          name: 'some name',
          description: 'desc',
          isActive: 'abc',
          abbreviation: 'abb'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"isActive" must be a boolean') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge track - unexpected field', async () => {
      try {
        await service.createChallengeTrack({
          name: 'some name',
          description: 'desc',
          isActive: false,
          abbreviation: 'abb',
          other: 123
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get challenge track tests', () => {
    it('get challenge track successfully', async () => {
      const result = await service.getChallengeTrack(id2)
      should.equal(result.id, id2)
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isActive, false)
      should.equal(result.abbreviation, abbreviation2)
    })

    it('get challenge track - not found', async () => {
      try {
        await service.getChallengeTrack(notFoundId)
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get challenge track - invalid id', async () => {
      try {
        await service.getChallengeTrack('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search challenge tracks tests', () => {
    it('search challenge tracks successfully 1', async () => {
      const result = await service.searchChallengeTracks({
        page: 1,
        perPage: 10,
        name: name2.substring(1).toUpperCase(),
        description: 'desc',
        isActive: false,
        abbreviation: abbreviation2
      })
      should.equal(result.total, 1)
      should.equal(result.page, 1)
      should.equal(result.perPage, 10)
      should.equal(result.result.length, 1)
      should.equal(result.result[0].id, id2)
      should.equal(result.result[0].name, name2)
      should.equal(result.result[0].description, 'desc2')
      should.equal(result.result[0].isActive, false)
      should.equal(result.result[0].abbreviation, abbreviation2)
    })

    it('search challenge tracks successfully 2', async () => {
      const result = await service.searchChallengeTracks({ name: 'xyzxyz123' })
      should.equal(result.total, 0)
      should.equal(result.page, 1)
      should.equal(result.perPage, 100)
      should.equal(result.result.length, 0)
    })

    it('search challenge tracks - invalid name', async () => {
      try {
        await service.searchChallengeTracks({ name: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge tracks - invalid description', async () => {
      try {
        await service.searchChallengeTracks({ description: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"description" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge tracks - invalid isActive', async () => {
      try {
        await service.searchChallengeTracks({ isActive: 'abc' })
      } catch (e) {
        should.equal(e.message.indexOf('"isActive" must be a boolean') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge tracks - invalid page', async () => {
      try {
        await service.searchChallengeTracks({ page: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge tracks - invalid perPage', async () => {
      try {
        await service.searchChallengeTracks({ perPage: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenge tracks - unexpected field', async () => {
      try {
        await service.searchChallengeTracks({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update challenge track tests', () => {
    it('fully update challenge track successfully', async () => {
      const result = await service.fullyUpdateChallengeTrack(id2, {
        name: `${name2}-updated`,
        description: 'desc222',
        isActive: true,
        abbreviation: `${abbreviation2}-updated`
      })
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-updated`)
      should.equal(result.description, 'desc222')
      should.equal(result.isActive, true)
      should.equal(result.abbreviation, `${abbreviation2}-updated`)
    })

    it('fully update challenge track - name already used', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id2, {
          name,
          description: 'desc',
          isActive: false,
          abbreviation: 'ab121212'
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - abbreviation already used', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id2, {
          name: `test-name-123-${new Date().getTime()}`,
          description: 'desc',
          isActive: false,
          abbreviation
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with abbreviation: ${abbreviation} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - not found', async () => {
      try {
        await service.fullyUpdateChallengeTrack(notFoundId, {
          name: 'slkdjflskjdf',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - invalid id', async () => {
      try {
        await service.fullyUpdateChallengeTrack('invalid', {
          name: 'slkdjflskjdf',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - null name', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id, {
          name: null,
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - invalid name', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id, {
          name: { invalid: 'x' },
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - invalid description', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id, {
          name: 'some name',
          description: ['desc'],
          isActive: false,
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"description" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - invalid abbreviation', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id, {
          name: 'some name',
          description: 'desc',
          isActive: false,
          abbreviation: ['ab']
        })
      } catch (e) {
        should.equal(e.message.indexOf('"abbreviation" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - empty name', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id, {
          name: '',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge track - invalid isActive', async () => {
      try {
        await service.fullyUpdateChallengeTrack(id, {
          name: 'asdfsadfsdf',
          description: 'desc',
          isActive: 'invalid',
          abbreviation: 'ab'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"isActive" must be a boolean') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('partially update challenge track tests', () => {
    it('partially update challenge track successfully 1', async () => {
      const result = await service.partiallyUpdateChallengeTrack(id2, {
        name: `${name2}-33`,
        description: 'desc33'
      })
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-33`)
      should.equal(result.description, 'desc33')
      should.equal(result.isActive, true)
      should.equal(result.abbreviation, `${abbreviation2}-updated`)
    })

    it('partially update challenge track - name already used', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(id2, {
          name
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - abbreviation already used', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(id2, {
          abbreviation
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with abbreviation: ${abbreviation} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - not found', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(notFoundId, {
          name: 'slkdjflskjdf'
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTrack with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - invalid id', async () => {
      try {
        await service.partiallyUpdateChallengeTrack('invalid', { name: 'hufdufhdfx' })
      } catch (e) {
        should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - null name', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(id, { name: null })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - invalid description', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(id, { description: { invalid: 'x' } })
      } catch (e) {
        should.equal(e.message.indexOf('"description" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - empty name', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(id, { name: '' })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge track - unexpected field', async () => {
      try {
        await service.partiallyUpdateChallengeTrack(id, { name: 'xx', other: 'xx' })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
