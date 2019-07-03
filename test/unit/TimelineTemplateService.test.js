/*
 * Unit tests of timeline template service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/TimelineTemplateService')
const helper = require('../../src/common/helper')

const should = chai.should()

describe('timeline template service unit tests', () => {
  // created entity ids
  let id
  let id2
  // random names
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const notFoundId = uuid()
  // reference data
  let phase

  before(async () => {
    phase = await helper.create('Phase', {
      id: uuid(),
      name: `phase${new Date().getTime()}`, // random name
      description: 'desc',
      isActive: true,
      duration: 123
    })
  })

  after(async () => {
    await phase.delete()
  })

  describe('create timeline template tests', () => {
    it('create timeline template successfully 1', async () => {
      const result = await service.createTimelineTemplate({
        name,
        description: 'desc',
        isActive: true,
        phases: [phase]
      })
      should.exist(result.id)
      id = result.id
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, true)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, phase.id)
      should.equal(result.phases[0].name, phase.name)
      should.equal(result.phases[0].description, phase.description)
      should.equal(result.phases[0].isActive, phase.isActive)
      should.equal(result.phases[0].duration, phase.duration)
    })

    it('create timeline template successfully 2', async () => {
      const result = await service.createTimelineTemplate({
        name: name2,
        description: 'desc',
        isActive: false,
        phases: [phase]
      })
      should.exist(result.id)
      id2 = result.id
      should.equal(result.name, name2)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, false)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, phase.id)
      should.equal(result.phases[0].name, phase.name)
      should.equal(result.phases[0].description, phase.description)
      should.equal(result.phases[0].isActive, phase.isActive)
      should.equal(result.phases[0].duration, phase.duration)
    })

    it('create timeline template - name already used', async () => {
      try {
        await service.createTimelineTemplate({
          name,
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('create timeline template - missing name', async () => {
      try {
        await service.createTimelineTemplate({
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create timeline template - invalid name', async () => {
      try {
        await service.createTimelineTemplate({
          name: ['xx'],
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create timeline template - invalid phases', async () => {
      try {
        await service.createTimelineTemplate({
          name: 'jjghurturt34',
          description: 'desc',
          isActive: false,
          phases: [{ id: phase.id, name: phase.name, isActive: false, duration: 345 }]
        })
      } catch (e) {
        should.equal(e.message.indexOf('phases are invalid or inactive') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create timeline template - missing phases', async () => {
      try {
        await service.createTimelineTemplate({
          name: 'jjghurturt34',
          description: 'desc',
          isActive: false,
          phases: []
        })
      } catch (e) {
        should.equal(e.message.indexOf('"phases" must contain at least 1 items') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create timeline template - unexpected field', async () => {
      try {
        await service.createTimelineTemplate({
          name: 'some name 1232323',
          description: 'desc',
          isActive: false,
          phases: [phase],
          other: 123
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get timeline template tests', () => {
    it('get timeline template successfully', async () => {
      const result = await service.getTimelineTemplate(id)
      should.equal(result.id, id)
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, true)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, phase.id)
      should.equal(result.phases[0].name, phase.name)
      should.equal(result.phases[0].description, phase.description)
      should.equal(result.phases[0].isActive, phase.isActive)
      should.equal(result.phases[0].duration, phase.duration)
    })

    it('get timeline template - not found', async () => {
      try {
        await service.getTimelineTemplate(notFoundId)
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get timeline template - invalid id', async () => {
      try {
        await service.getTimelineTemplate('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search timeline templates tests', () => {
    it('search timeline templates successfully 1', async () => {
      const result = await service.searchTimelineTemplates({ page: 1, perPage: 10, name: name.substring(1).toUpperCase() })
      should.equal(result.total, 1)
      should.equal(result.page, 1)
      should.equal(result.perPage, 10)
      should.equal(result.result.length, 1)
      should.equal(result.result[0].id, id)
      should.equal(result.result[0].name, name)
      should.equal(result.result[0].description, 'desc')
      should.equal(result.result[0].isActive, true)
      should.equal(result.result[0].phases.length, 1)
      should.equal(result.result[0].phases[0].id, phase.id)
      should.equal(result.result[0].phases[0].name, phase.name)
      should.equal(result.result[0].phases[0].description, phase.description)
      should.equal(result.result[0].phases[0].isActive, phase.isActive)
      should.equal(result.result[0].phases[0].duration, phase.duration)
    })

    it('search timeline templates successfully 2', async () => {
      const result = await service.searchTimelineTemplates({ name: 'xyzxyz123' })
      should.equal(result.total, 0)
      should.equal(result.page, 1)
      should.equal(result.perPage, 20)
      should.equal(result.result.length, 0)
    })

    it('search timeline templates - invalid name', async () => {
      try {
        await service.searchTimelineTemplates({ name: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - invalid page', async () => {
      try {
        await service.searchTimelineTemplates({ page: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - invalid perPage', async () => {
      try {
        await service.searchTimelineTemplates({ perPage: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search timeline templates - unexpected field', async () => {
      try {
        await service.searchTimelineTemplates({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update timeline template tests', () => {
    it('fully update timeline template successfully', async () => {
      const result = await service.fullyUpdateTimelineTemplate(id, {
        name: `${name}-updated`,
        description: 'desc222',
        isActive: false,
        phases: [phase]
      })
      should.equal(result.id, id)
      should.equal(result.name, `${name}-updated`)
      should.equal(result.description, 'desc222')
      should.equal(result.isActive, false)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, phase.id)
      should.equal(result.phases[0].name, phase.name)
      should.equal(result.phases[0].description, phase.description)
      should.equal(result.phases[0].isActive, phase.isActive)
      should.equal(result.phases[0].duration, phase.duration)
    })

    it('fully update timeline template - name already used', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(id, {
          name: name2,
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with name: ${name2} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - not found', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(notFoundId, {
          name: 'slkdjflskjdf',
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - invalid id', async () => {
      try {
        await service.fullyUpdateTimelineTemplate('invalid', {
          name: 'slkdjflskjdf',
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - null name', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(id, {
          name: null,
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - invalid name', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(id, {
          name: { invalid: 'x' },
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - empty name', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(id, {
          name: '',
          description: 'desc',
          isActive: false,
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - invalid isActive', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(id, {
          name: 'asdfsadfsdf',
          description: 'desc',
          isActive: 'invalid',
          phases: [phase]
        })
      } catch (e) {
        should.equal(e.message.indexOf('"isActive" must be a boolean') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update timeline template - missing phases', async () => {
      try {
        await service.fullyUpdateTimelineTemplate(id, {
          name: 'asdfsadfsdf',
          description: 'desc',
          isActive: true
        })
      } catch (e) {
        should.equal(e.message.indexOf('"phases" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('partially update timeline template tests', () => {
    it('partially update timeline template successfully 1', async () => {
      const result = await service.partiallyUpdateTimelineTemplate(id, {
        name: `${name}-33`,
        description: 'desc33'
      })
      should.equal(result.id, id)
      should.equal(result.name, `${name}-33`)
      should.equal(result.description, 'desc33')
      should.equal(result.isActive, false)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, phase.id)
      should.equal(result.phases[0].name, phase.name)
      should.equal(result.phases[0].description, phase.description)
      should.equal(result.phases[0].isActive, phase.isActive)
      should.equal(result.phases[0].duration, phase.duration)
    })

    it('partially update timeline template - name already used', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(id, {
          name: name2
        })
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with name: ${name2} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - not found', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(notFoundId, {
          name: 'slkdjflskjdf'
        })
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - invalid id', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate('invalid', { name: 'hufdufhdfx' })
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - null name', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(id, { name: null })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - invalid description', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(id, { description: { invalid: 'x' } })
      } catch (e) {
        should.equal(e.message.indexOf('"description" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - invalid isActive', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(id, { isActive: 'abc' })
      } catch (e) {
        should.equal(e.message.indexOf('"isActive" must be a boolean') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - empty name', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(id, { name: '' })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update timeline template - unexpected field', async () => {
      try {
        await service.partiallyUpdateTimelineTemplate(id, { name: 'ww', other: 'ww' })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('remove timeline template tests', () => {
    it('remove timeline template successfully 1', async () => {
      await service.deleteTimelineTemplate(id)
    })

    it('remove timeline template successfully 2', async () => {
      await service.deleteTimelineTemplate(id2)
    })

    it('remove timeline template - not found', async () => {
      try {
        await service.deleteTimelineTemplate(notFoundId)
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('remove timeline template - invalid id', async () => {
      try {
        await service.deleteTimelineTemplate('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"timelineTemplateId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
