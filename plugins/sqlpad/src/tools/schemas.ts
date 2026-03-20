import { z } from 'zod';

// --- Connection ---

export const connectionSchema = z.object({
  id: z.string().describe('Connection ID used to reference this database connection'),
  name: z.string().describe('Human-readable connection name'),
  driver: z.string().describe('Database driver type (e.g., postgres, mysql, sqlserver)'),
  host: z.string().describe('Database host address'),
  port: z.string().describe('Database port'),
  database: z.string().describe('Database name'),
  maxRows: z.number().describe('Maximum rows returned per query for this connection'),
  supportsConnectionClient: z.boolean().describe('Whether the connection supports persistent clients'),
});

export interface RawConnection {
  id?: string;
  name?: string;
  driver?: string;
  host?: string;
  port?: string | number;
  database?: string;
  maxRows?: number;
  supportsConnectionClient?: boolean;
}

export const mapConnection = (c: RawConnection) => ({
  id: c.id ?? '',
  name: c.name ?? '',
  driver: c.driver ?? '',
  host: c.host ?? '',
  port: String(c.port ?? ''),
  database: c.database ?? '',
  maxRows: c.maxRows ?? 0,
  supportsConnectionClient: c.supportsConnectionClient ?? false,
});

// --- Schema (database structure) ---

export const columnSchema = z.object({
  name: z.string().describe('Column name'),
  dataType: z.string().describe('Column data type (e.g., varchar, int4, timestamp)'),
});

export const tableSchema = z.object({
  name: z.string().describe('Table name'),
  columns: z.array(columnSchema).describe('Columns in this table'),
});

export const dbSchemaSchema = z.object({
  name: z.string().describe('Schema name (e.g., public)'),
  tables: z.array(tableSchema).describe('Tables in this schema'),
});

export interface RawColumn {
  name?: string;
  dataType?: string;
}

export interface RawTable {
  name?: string;
  columns?: RawColumn[];
}

export interface RawDbSchema {
  name?: string;
  tables?: RawTable[];
}

export const mapColumn = (c: RawColumn) => ({
  name: c.name ?? '',
  dataType: c.dataType ?? '',
});

export const mapTable = (t: RawTable) => ({
  name: t.name ?? '',
  columns: (t.columns ?? []).map(mapColumn),
});

export const mapDbSchema = (s: RawDbSchema) => ({
  name: s.name ?? '',
  tables: (s.tables ?? []).map(mapTable),
});

// --- Saved Query ---

export const savedQuerySchema = z.object({
  id: z.string().describe('Saved query ID'),
  name: z.string().describe('Query name'),
  connectionId: z.string().describe('Connection ID the query targets'),
  queryText: z.string().describe('SQL query text'),
  tags: z.array(z.string()).describe('Tags assigned to this query'),
  createdBy: z.string().describe('User ID who created the query'),
  createdAt: z.string().describe('ISO 8601 timestamp when the query was created'),
  updatedAt: z.string().describe('ISO 8601 timestamp when the query was last updated'),
  canRead: z.boolean().describe('Whether the current user can read this query'),
  canWrite: z.boolean().describe('Whether the current user can edit this query'),
  canDelete: z.boolean().describe('Whether the current user can delete this query'),
});

export interface RawSavedQuery {
  id?: string;
  name?: string;
  connectionId?: string;
  queryText?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
}

export const mapSavedQuery = (q: RawSavedQuery) => ({
  id: q.id ?? '',
  name: q.name ?? '',
  connectionId: q.connectionId ?? '',
  queryText: q.queryText ?? '',
  tags: q.tags ?? [],
  createdBy: q.createdBy ?? '',
  createdAt: q.createdAt ?? '',
  updatedAt: q.updatedAt ?? '',
  canRead: q.canRead ?? false,
  canWrite: q.canWrite ?? false,
  canDelete: q.canDelete ?? false,
});

// --- Query History ---

export const queryHistorySchema = z.object({
  id: z.string().describe('History entry ID'),
  connectionId: z.string().describe('Connection ID used for the query'),
  connectionName: z.string().describe('Connection name'),
  userEmail: z.string().describe('Email of the user who ran the query'),
  status: z.string().describe('Execution status (finished, error)'),
  startTime: z.string().describe('ISO 8601 timestamp when the query started'),
  stopTime: z.string().describe('ISO 8601 timestamp when the query finished'),
  durationMs: z.number().describe('Query execution time in milliseconds'),
  queryText: z.string().describe('SQL query text that was executed'),
  rowCount: z.number().describe('Number of rows returned'),
  incomplete: z.boolean().describe('Whether results were truncated'),
});

export interface RawQueryHistory {
  id?: string;
  connectionId?: string;
  connectionName?: string;
  userEmail?: string;
  status?: string;
  startTime?: string;
  stopTime?: string;
  durationMs?: number;
  queryText?: string;
  rowCount?: number | string;
  incomplete?: boolean;
}

export const mapQueryHistory = (h: RawQueryHistory) => ({
  id: h.id ?? '',
  connectionId: h.connectionId ?? '',
  connectionName: h.connectionName ?? '',
  userEmail: h.userEmail ?? '',
  status: h.status ?? '',
  startTime: h.startTime ?? '',
  stopTime: h.stopTime ?? '',
  durationMs: h.durationMs ?? 0,
  queryText: h.queryText ?? '',
  rowCount: typeof h.rowCount === 'string' ? Number(h.rowCount) : (h.rowCount ?? 0),
  incomplete: h.incomplete ?? false,
});

// --- Current User ---

export const currentUserSchema = z.object({
  id: z.string().describe('User ID'),
  email: z.string().describe('User email address'),
  role: z.string().describe('User role (admin, editor, viewer)'),
});

export interface RawCurrentUser {
  id?: string;
  email?: string;
  role?: string;
}

export const mapCurrentUser = (u: RawCurrentUser) => ({
  id: u.id ?? '',
  email: u.email ?? '',
  role: u.role ?? '',
});

// --- Query Result ---

export const queryResultColumnSchema = z.object({
  name: z.string().describe('Column name'),
  type: z.string().describe('Column data type'),
});

export const queryResultSchema = z.object({
  columns: z.array(queryResultColumnSchema).describe('Column definitions'),
  rows: z.array(z.record(z.string(), z.unknown())).describe('Result rows as objects keyed by column name'),
  rowCount: z.number().describe('Total number of rows returned by the query'),
  executionTimeMs: z.number().describe('Query execution time in milliseconds'),
  truncated: z.boolean().describe('Whether results were truncated to maxRows limit'),
});
