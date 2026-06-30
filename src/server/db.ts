// Server-side DB helper. Works like `src/lib/db.ts` but kept separate for
// server-only code. If Prisma is not enabled, export a stub to avoid build
// failure in projects that haven't adopted Prisma yet.

declare global {
  // allow global prisma during dev to avoid creating multiple clients
  // eslint-disable-next-line no-var
  var __prisma: any | undefined
}

let prismaClient: any = undefined
if (process.env.PRISMA_ENABLED === 'true') {
  try {
    const pkgName = '@prisma/client'
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const pkg = require(pkgName)
    const PrismaClient = pkg?.PrismaClient
    if (PrismaClient) {
      prismaClient = global.__prisma ?? new PrismaClient()
      if (process.env.NODE_ENV !== 'production') global.__prisma = prismaClient
    }
  } catch (e) {
    // warn and continue with stub
    // eslint-disable-next-line no-console
    console.warn('Prisma client not available on server. Set PRISMA_ENABLED=true and install @prisma/client to enable DB access.')
  }
}

if (!prismaClient) {
  prismaClient = new Proxy({}, {
    get(_, prop) {
      return () => {
        throw new Error('Prisma is not enabled. Accessed `' + String(prop) + '`. Install @prisma/client and enable PRISMA_ENABLED to use DB operations.')
      }
    }
  })
}

export const prisma = prismaClient
