import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

interface Connection {
  client: postgres.Sql;
  db: ReturnType<typeof createDb>;
}

function createDb(client: postgres.Sql) {
  return drizzle(client, { schema });
}

function createConnection(): Connection {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL не задан: скопируй .env.example в .env и укажи строку подключения',
    );
  }
  const client = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return { client, db: createDb(client) };
}

const globalForDb = globalThis as unknown as {
  __financeConnection?: Connection;
};

export function getDb(): ReturnType<typeof createDb> {
  globalForDb.__financeConnection ??= createConnection();
  return globalForDb.__financeConnection.db;
}

export function getSqlClient(): postgres.Sql {
  globalForDb.__financeConnection ??= createConnection();
  return globalForDb.__financeConnection.client;
}
