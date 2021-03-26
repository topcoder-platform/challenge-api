/*
 * Unit tests of challenge timeline template service
 */

require('../../app-bootstrap')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/ChallengeTimelineTemplateService')
const helper = require('../../src/common/helper')

const should = chai.should()

describe('timeline template service unit tests', () => {
  // created entity id
  let id
  // reference data
  let type
  let type2
  let type3
  let track
  let timelineTemplate

  const notFoundId = uuid()

  before(async () => {
    type = await helper.create('ChallengeType', {
      id: uuid(),
      name: `type-${new Date().getTime()}`, // random name
      description: 'desc',
      isActive: true,
      abbreviation: 'test'
    })
    type2 = await helper.create('ChallengeType', {
      id: uuid(),
      name: `type2-${new Date().getTime()}`, // random name
      description: 'desc2',
      isActive: true,
      abbreviation: 'test2'
    })
    type3 = await helper.create('ChallengeType', {
      id: uuid(),
      name: `type3-${new Date().getTime()}`, // random name
      description: 'desc3',
      isActive: true,
      abbreviation: 'test3'
    })
    track = await helper.create('ChallengeTrack', {
      id: uuid(),
      name: `type-${new Date().getTime()}`, // random name
      description: 'desc',
      isActive: true,
      abbreviation: 'test'
    })
    timelineTemplate = await helper.create('TimelineTemplate', {
      id: uuid(),
      name: `template-${new Date().getTime()}`, // random name
      description: 'desc',
      isActive: true,
      phases: [{
        id: uuid(),
        name: 'test',
        isOpen: true,
        duration: 123
      }]
    })
  })

  after(async () => {
    await type.delete()
    await type2.delete()
    await type3.delete()
    await track.delete()
    await timelineTemplate.delete()
  })

  describe('create challenge timeline template tests', () => {
    it('create challenge timeline template successfully', async () => {
      const result = await service.createChallengeTimelineTemplate({
        typeId: type.id,
        trackId: track.id,
        timelineTemplateId: timelineTemplate.id,
        isDefault: false
      })
      should.exist(result.id)
      id = result.id
      should.equal(result.typeId, type.id)
      should.equal(result.trackId, track.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('create challenge timeline template successfully with isDefault true', async () => {
      const result = await service.createChallengeTimelineTemplate({
        typeId: type3.id,
        trackId: track.id,
        timelineTemplateId: timelineTemplate.id,
        isDefault: true
      })
      should.exist(result.id)
      should.equal(result.typeId, type3.id)
      should.equal(result.trackId, track.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('create challenge timeline template - already defined', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: type.id,
          trackId: track.id,
          timelineTemplateId: timelineTemplate.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message, 'The challenge timeline template is already defined.')
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - missing typeId', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          trackId: track.id,
          timelineTemplateId: timelineTemplate.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - invalid typeId', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: 'abc',
          trackId: track.id,
          timelineTemplateId: timelineTemplate.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - missing trackId', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"trackId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - invalid trackId', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: type.id,
          trackId: 'abc',
          timelineTemplateId: timelineTemplate.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"trackId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - missing timelineTemplateId', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: type.id,
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - invalid timelineTemplateId', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: type.id,
          trackId: track.id,
          timelineTemplateId: 'abc',
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge timeline template - unexpected field', async () => {
      try {
        await service.createChallengeTimelineTemplate({
          typeId: type.id,
          trackId: track.id,
          timelineTemplateId: timelineTemplate.id,
          isDefault: false,
          other: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get challenge timeline template tests', () => {
    it('get challenge timeline template successfully', async () => {
      const result = await service.getChallengeTimelineTemplate(id)
      should.equal(result.id, id)
      should.equal(result.typeId, type.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('get challenge timeline template - not found', async () => {
      try {
        await service.getChallengeTimelineTemplate(notFoundId)
      } catch (e) {
        should.equal(e.message, `ChallengeTimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get challenge timeline template - invalid id', async () => {
      try {
        await service.getChallengeTimelineTemplate('invalid')
      } catch (e) {
        should.equal(e.details[0].message.indexOf('"challengeTimelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search challenge timeline templates tests', () => {
    it('search timeline templates successfully 1', async () => {
      const result = await service.searchChallengeTimelineTemplates({})
      should.equal(result.length >= 1, true)
      should.exist(result[0].typeId)
      should.exist(result[0].trackId)
      should.exist(result[0].timelineTemplateId)
    })

    it('search timeline templates successfully 2', async () => {
      const result = await service.searchChallengeTimelineTemplates({ typeId: type.id })
      should.equal(result.length, 1)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].trackId, track.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search timeline templates successfully 3', async () => {
      const result = await service.searchChallengeTimelineTemplates({ timelineTemplateId: timelineTemplate.id })
      should.equal(result.length, 2)
      should.equal(result[0].trackId, track.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search timeline templates successfully 4', async () => {
      const result = await service.searchChallengeTimelineTemplates({ trackId: track.id })
      should.equal(result.length, 2)
      should.equal(result[0].trackId, track.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search timeline templates successfully 5', async () => {
      const result = await service.searchChallengeTimelineTemplates({ typeId: notFoundId })
      should.equal(result.length, 0)
    })

    it('search timeline templates - invalid typeId', async () => {
      try {
        await service.searchChallengeTimelineTemplates({ typeId: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - invalid timelineTemplateId', async () => {
      try {
        await service.searchChallengeTimelineTemplates({ timelineTemplateId: 'abc' })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - unexpected field', async () => {
      try {
        await service.searchChallengeTimelineTemplates({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update challenge timeline template tests', () => {
    it('fully update challenge timeline template successfully', async () => {
      const result = await service.fullyUpdateChallengeTimelineTemplate(id, {
        typeId: type2.id,
        trackId: track.id,
        timelineTemplateId: timelineTemplate.id,
        isDefault: false
      })
      should.equal(result.id, id)
      should.equal(result.typeId, type2.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('fully update challenge timeline template - not found', async () => {
      try {
        await service.fullyUpdateChallengeTimelineTemplate(notFoundId, {
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id,
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge timeline template - invalid id', async () => {
      try {
        await service.fullyUpdateChallengeTimelineTemplate('invalid', {
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id,
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"challengeTimelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge timeline template - null typeId', async () => {
      try {
        await service.fullyUpdateChallengeTimelineTemplate(id, {
          typeId: null,
          timelineTemplateId: timelineTemplate.id,
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.details[0].message.indexOf('"typeId" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge timeline template - invalid typeId', async () => {
      try {
        await service.fullyUpdateChallengeTimelineTemplate(id, {
          typeId: { invalid: 'x' },
          timelineTemplateId: timelineTemplate.id,
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.details[0].message.indexOf('"typeId" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge timeline template - empty timelineTemplateId', async () => {
      try {
        await service.fullyUpdateChallengeTimelineTemplate(id, {
          typeId: type.id,
          timelineTemplateId: '',
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge timeline template - missing timelineTemplateId', async () => {
      try {
        await service.fullyUpdateChallengeTimelineTemplate(id, {
          typeId: type.id,
          trackId: track.id,
          isDefault: false
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('remove challenge timeline template tests', () => {
    it('remove challenge timeline template successfully', async () => {
      const result = await service.deleteChallengeTimelineTemplate(id)
      should.equal(result.id, id)
      should.equal(result.typeId, type2.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('remove challenge timeline template - not found 1', async () => {
      try {
        await service.deleteChallengeTimelineTemplate(notFoundId)
      } catch (e) {
        should.equal(e.message, `ChallengeTimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('remove challenge timeline template - not found 2', async () => {
      try {
        await service.deleteChallengeTimelineTemplate(id)
      } catch (e) {
        should.equal(e.message, `ChallengeTimelineTemplate with id: ${id} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('remove challenge timeline template - invalid id', async () => {
      try {
        await service.deleteChallengeTimelineTemplate('invalid')
      } catch (e) {
        should.equal(e.details[0].message.indexOf('"challengeTimelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
