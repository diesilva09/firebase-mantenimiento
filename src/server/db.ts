import { PrismaClient } from '@prisma/client'

declare global {
  // allow global prisma during dev to avoid creating multiple clients
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma = global.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma
