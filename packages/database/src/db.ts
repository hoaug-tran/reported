import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../../.env");

dotenv.config({ path: envPath });

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://reported_user:reported_password@127.0.0.1:5435/reported_db";

console.log(
  `🔗 Database connecting to: ${connectionString.replace(/:[^:@]+@/, ":****@")}`,
);

export const pool = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
