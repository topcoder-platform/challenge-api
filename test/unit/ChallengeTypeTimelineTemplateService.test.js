/*
 * Unit tests of challenge type timeline template service
 */

require('../../app-bootstrap')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/ChallengeTypeTimelineTemplateService')
const helper = require('../../src/common/helper')

const should = chai.should()

describe('timeline template service unit tests', () => {
  // created entity id
  let id
  // reference data
  let type
  let type2
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
    await timelineTemplate.delete()
  })

  describe('create challenge type timeline template tests', () => {
    it('create challenge type timeline template successfully', async () => {
      const result = await service.createChallengeTypeTimelineTemplate({
        typeId: type.id,
        timelineTemplateId: timelineTemplate.id
      })
      should.exist(result.id)
      id = result.id
      should.equal(result.typeId, type.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('create challenge type timeline template - already defined', async () => {
      try {
        await service.createChallengeTypeTimelineTemplate({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message, 'The challenge type timeline template is already defined.')
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge type timeline template - missing typeId', async () => {
      try {
        await service.createChallengeTypeTimelineTemplate({
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge type timeline template - invalid typeId', async () => {
      try {
        await service.createChallengeTypeTimelineTemplate({
          typeId: 'abc',
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge type timeline template - missing timelineTemplateId', async () => {
      try {
        await service.createChallengeTypeTimelineTemplate({
          typeId: type.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge type timeline template - invalid timelineTemplateId', async () => {
      try {
        await service.createChallengeTypeTimelineTemplate({
          typeId: type.id,
          timelineTemplateId: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge type timeline template - unexpected field', async () => {
      try {
        await service.createChallengeTypeTimelineTemplate({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id,
          other: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get challenge type timeline template tests', () => {
    it('get challenge type timeline template successfully', async () => {
      const result = await service.getChallengeTypeTimelineTemplate(id)
      should.equal(result.id, id)
      should.equal(result.typeId, type.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('get challenge type timeline template - not found', async () => {
      try {
        await service.getChallengeTypeTimelineTemplate(notFoundId)
      } catch (e) {
        should.equal(e.message, `ChallengeTypeTimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get challenge type timeline template - invalid id', async () => {
      try {
        await service.getChallengeTypeTimelineTemplate('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"challengeTypeTimelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search challenge type timeline templates tests', () => {
    it('search timeline templates successfully 1', async () => {
      const result = await service.searchChallengeTypeTimelineTemplates({})
      should.equal(result.length, 1)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search timeline templates successfully 2', async () => {
      const result = await service.searchChallengeTypeTimelineTemplates({ typeId: type.id })
      should.equal(result.length, 1)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search timeline templates successfully 3', async () => {
      const result = await service.searchChallengeTypeTimelineTemplates({ timelineTemplateId: timelineTemplate.id })
      should.equal(result.length, 1)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search timeline templates successfully 4', async () => {
      const result = await service.searchChallengeTypeTimelineTemplates({ typeId: notFoundId })
      should.equal(result.length, 0)
    })

    it('search timeline templates - invalid typeId', async () => {
      try {
        await service.searchChallengeTypeTimelineTemplates({ typeId: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - invalid timelineTemplateId', async () => {
      try {
        await service.searchChallengeTypeTimelineTemplates({ timelineTemplateId: 'abc' })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - unexpected field', async () => {
      try {
        await service.searchChallengeTypeTimelineTemplates({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update challenge type timeline template tests', () => {
    it('fully update challenge type timeline template successfully', async () => {
      const result = await service.fullyUpdateChallengeTypeTimelineTemplate(id, {
        typeId: type2.id,
        timelineTemplateId: timelineTemplate.id
      })
      should.equal(result.id, id)
      should.equal(result.typeId, type2.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('fully update challenge type timeline template - not found', async () => {
      try {
        await service.fullyUpdateChallengeTypeTimelineTemplate(notFoundId, {
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message, `ChallengeTypeTimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge type timeline template - invalid id', async () => {
      try {
        await service.fullyUpdateChallengeTypeTimelineTemplate('invalid', {
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"challengeTypeTimelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge type timeline template - null typeId', async () => {
      try {
        await service.fullyUpdateChallengeTypeTimelineTemplate(id, {
          typeId: null,
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge type timeline template - invalid typeId', async () => {
      try {
        await service.fullyUpdateChallengeTypeTimelineTemplate(id, {
          typeId: { invalid: 'x' },
          timelineTemplateId: timelineTemplate.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge type timeline template - empty timelineTemplateId', async () => {
      try {
        await service.fullyUpdateChallengeTypeTimelineTemplate(id, {
          typeId: type.id,
          timelineTemplateId: ''
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge type timeline template - missing timelineTemplateId', async () => {
      try {
        await service.fullyUpdateChallengeTypeTimelineTemplate(id, {
          typeId: type.id
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('remove challenge type timeline template tests', () => {
    it('remove challenge type timeline template successfully', async () => {
      const result = await service.deleteChallengeTypeTimelineTemplate(id)
      should.equal(result.id, id)
      should.equal(result.typeId, type2.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('remove challenge type timeline template - not found 1', async () => {
      try {
        await service.deleteChallengeTypeTimelineTemplate(notFoundId)
      } catch (e) {
        should.equal(e.message, `ChallengeTypeTimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('remove challenge type timeline template - not found 2', async () => {
      try {
        await service.deleteChallengeTypeTimelineTemplate(id)
      } catch (e) {
        should.equal(e.message, `ChallengeTypeTimelineTemplate with id: ${id} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('remove challenge type timeline template - invalid id', async () => {
      try {
        await service.deleteChallengeTypeTimelineTemplate('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"challengeTypeTimelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
