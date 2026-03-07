import { getDb } from '@/lib/db';

export type Db = ReturnType<typeof getDb>;
export type SqlParam = string | number;

export interface MarketsWhereClause {
  whereClause: string;
  params: SqlParam[];
}
