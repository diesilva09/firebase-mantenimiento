// This file provides a Prisma client when Prisma is installed and enabled.
// If Prisma is not installed (we haven't adopted it yet), we export a
// lightweight stub that throws descriptive errors when used. This keeps the
// build working even without @prisma/client installed.

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: any | undefined
}

let prismaClient: any = undefined

// Simple Postgres query helper using `pg`. This is used by many API
// endpoints to run SQL directly. It uses a global pool during dev to avoid
// creating too many connections.
let pgPool: any = undefined
function getPgPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!pgPool) {
    // Lazy require so bundlers don't try to include 'pg' in client bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg')
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pgPool
}

export async function query(text: string, params?: any[]) {
  const pool = getPgPool()
  return pool.query(text, params)
}

// Only attempt to import Prisma when explicitly enabled to avoid bundler
// errors in repos that haven't adopted Prisma yet.
if (process.env.PRISMA_ENABLED === 'true') {
  // Dynamic import using a more webpack-friendly approach
  const loadPrisma = () => {
    try {
      // Use dynamic import that webpack can handle better
      const { PrismaClient } = require('@prisma/client');
      return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
    } catch (error) {
      // If import fails, we intentionally do not throw so that builds succeed
      // in environments that don't have Prisma installed.
      // eslint-disable-next-line no-console
      console.warn('Prisma client not available. Set PRISMA_ENABLED=true and install @prisma/client to enable DB access.');
      return null;
    }
  };

  prismaClient = global.prisma || loadPrisma();
  if (process.env.NODE_ENV !== 'production') global.prisma = prismaClient;
}

if (!prismaClient) {
  // Lightweight stub that throws helpful errors when a DB operation is attempted.
  const handler: ProxyHandler<any> = {
    get(_, prop) {
      // return a function that throws when invoked
      return (..._args: any[]) => {
        throw new Error(
          'Prisma is not enabled in this environment. Tried to access `' + String(prop) + '`.\n' +
            "To enable, install '@prisma/client' and set PRISMA_ENABLED=true (or update your deployment)."
        )
      }
    },
  }
  prismaClient = new Proxy({}, handler)
}

export const prisma = prismaClient
