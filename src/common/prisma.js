const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ]
})

// By running the first query, prisma calls $connect() under the hood
module.exports.prismaConnect = () => {
  prisma.$connect()
}

module.exports.getClient = () => {
  return prisma
}
