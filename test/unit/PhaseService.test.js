/*
 * Unit tests of phase service
 */

require('../../app-bootstrap')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/PhaseService')

const should = chai.should()

describe('phase service unit tests', () => {
  // created entity ids
  let id
  let id2
  // random names
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const notFoundId = uuid()

  describe('create phase tests', () => {
    it('create phase successfully 1', async () => {
      const result = await service.createPhase({
        name,
        description: 'desc',
        isOpen: true,
        duration: 123
      })
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isOpen, true)
      should.equal(result.duration, 123)
      should.exist(result.id)
      id = result.id
    })

    it('create phase successfully 2', async () => {
      const result = await service.createPhase({
        name: name2,
        description: 'desc2',
        isOpen: false,
        duration: 456
      })
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isOpen, false)
      should.equal(result.duration, 456)
      should.exist(result.id)
      id2 = result.id
    })

    it('create phase - name already used', async () => {
      try {
        await service.createPhase({
          name,
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message, `Phase with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('create phase - missing name', async () => {
      try {
        await service.createPhase({
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create phase - invalid name', async () => {
      try {
        await service.createPhase({
          name: ['xx'],
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create phase - invalid duration', async () => {
      try {
        await service.createPhase({
          name: 'some name',
          description: 'desc',
          isOpen: false,
          duration: -456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"duration" must be a positive number') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create phase - unexpected field', async () => {
      try {
        await service.createPhase({
          name: 'some name',
          description: 'desc',
          isOpen: false,
          duration: 456,
          other: 123
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get phase tests', () => {
    it('get phase successfully', async () => {
      const result = await service.getPhase(id2)
      should.equal(result.id, id2)
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isOpen, false)
      should.equal(result.duration, 456)
    })

    it('get phase - not found', async () => {
      try {
        await service.getPhase(notFoundId)
      } catch (e) {
        should.equal(e.message, `Phase with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get phase - invalid id', async () => {
      try {
        await service.getPhase('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"phaseId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search phases tests', () => {
    it('search phases successfully 1', async () => {
      const result = await service.searchPhases({ page: 1, perPage: 10, name: name2.substring(1).toUpperCase() })
      should.equal(result.total, 1)
      should.equal(result.page, 1)
      should.equal(result.perPage, 10)
      should.equal(result.result.length, 1)
      should.equal(result.result[0].id, id2)
      should.equal(result.result[0].name, name2)
      should.equal(result.result[0].description, 'desc2')
      should.equal(result.result[0].isOpen, false)
      should.equal(result.result[0].duration, 456)
    })

    it('search phases successfully 2', async () => {
      const result = await service.searchPhases({ name: 'xyzxyz123' })
      should.equal(result.total, 0)
      should.equal(result.page, 1)
      should.equal(result.perPage, 100)
      should.equal(result.result.length, 0)
    })

    it('search phases - invalid name', async () => {
      try {
        await service.searchPhases({ name: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search phases - invalid page', async () => {
      try {
        await service.searchPhases({ page: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search phases - invalid perPage', async () => {
      try {
        await service.searchPhases({ perPage: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search phases - unexpected field', async () => {
      try {
        await service.searchPhases({ other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update phase tests', () => {
    it('fully update phase successfully', async () => {
      const result = await service.fullyUpdatePhase(id2, {
        name: `${name2}-updated`,
        description: 'desc222',
        isOpen: true,
        duration: 789
      })
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-updated`)
      should.equal(result.description, 'desc222')
      should.equal(result.isOpen, true)
      should.equal(result.duration, 789)
    })

    it('fully update phase - name already used', async () => {
      try {
        await service.fullyUpdatePhase(id2, {
          name,
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message, `Phase with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update phase - not found', async () => {
      try {
        await service.fullyUpdatePhase(notFoundId, {
          name: 'slkdjflskjdf',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message, `Phase with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update phase - invalid id', async () => {
      try {
        await service.fullyUpdatePhase('invalid', {
          name: 'slkdjflskjdf',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"phaseId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update phase - null name', async () => {
      try {
        await service.fullyUpdatePhase(id, {
          name: null,
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update phase - invalid name', async () => {
      try {
        await service.fullyUpdatePhase(id, {
          name: { invalid: 'x' },
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update phase - empty name', async () => {
      try {
        await service.fullyUpdatePhase(id, {
          name: '',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update phase - invalid isOpen', async () => {
      try {
        await service.fullyUpdatePhase(id, {
          name: 'asdfsadfsdf',
          description: 'desc',
          isOpen: 'invalid',
          duration: 456
        })
      } catch (e) {
        should.equal(e.message.indexOf('"isOpen" must be a boolean') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('partially update phase tests', () => {
    it('partially update phase successfully 1', async () => {
      const result = await service.partiallyUpdatePhase(id2, {
        name: `${name2}-33`,
        description: 'desc33',
        duration: 111
      })
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-33`)
      should.equal(result.description, 'desc33')
      should.equal(result.isOpen, true)
      should.equal(result.duration, 111)
    })

    it('partially update phase - name already used', async () => {
      try {
        await service.partiallyUpdatePhase(id2, {
          name
        })
      } catch (e) {
        should.equal(e.message, `Phase with name: ${name} already exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update phase - not found', async () => {
      try {
        await service.partiallyUpdatePhase(notFoundId, {
          name: 'slkdjflskjdf'
        })
      } catch (e) {
        should.equal(e.message, `Phase with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update phase - invalid id', async () => {
      try {
        await service.partiallyUpdatePhase('invalid', { name: 'hufdufhdfx' })
      } catch (e) {
        should.equal(e.message.indexOf('"phaseId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update phase - null name', async () => {
      try {
        await service.partiallyUpdatePhase(id, { name: null })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update phase - invalid description', async () => {
      try {
        await service.partiallyUpdatePhase(id, { description: { invalid: 'x' } })
      } catch (e) {
        should.equal(e.message.indexOf('"description" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update phase - empty name', async () => {
      try {
        await service.partiallyUpdatePhase(id, { name: '' })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update phase - unexpected field', async () => {
      try {
        await service.partiallyUpdatePhase(id, { name: 'xx', other: 'xx' })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('remove phase tests', () => {
    it('remove phase successfully 1', async () => {
      await service.deletePhase(id2)
    })

    it('remove phase successfully 2', async () => {
      await service.deletePhase(id)
    })

    it('remove phase - not found', async () => {
      try {
        await service.deletePhase(notFoundId)
      } catch (e) {
        should.equal(e.message, `Phase with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('remove phase - invalid id', async () => {
      try {
        await service.deletePhase('invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"phaseId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
