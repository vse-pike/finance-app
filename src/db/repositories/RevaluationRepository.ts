import { asc, eq } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { getDb } from '@/db/client';
import { revaluation } from '@/db/schema';
import type {
  RevaluationProps,
  RevaluationRepository as IRevaluationRepository,
} from '@/domain/types';

type RevaluationRow = typeof revaluation.$inferSelect;

function toProps(row: RevaluationRow): RevaluationProps {
  return {
    id: row.id,
    assetId: row.assetId,
    onDate: row.onDate,
    priceNative: new Decimal(row.priceNative),
    kind: row.kind,
    source: row.source ?? null,
    note: row.note ?? null,
  };
}

export class RevaluationRepository implements IRevaluationRepository {
  async listByAsset(assetId: string): Promise<RevaluationProps[]> {
    const rows = await getDb()
      .select()
      .from(revaluation)
      .where(eq(revaluation.assetId, assetId))
      .orderBy(asc(revaluation.onDate), asc(revaluation.id));
    return rows.map(toProps);
  }
  async listAll(): Promise<RevaluationProps[]> {
    const rows = await getDb()
      .select()
      .from(revaluation)
      .orderBy(asc(revaluation.onDate), asc(revaluation.id));
    return rows.map(toProps);
  }
  async add(props: Omit<RevaluationProps, 'id'>): Promise<RevaluationProps> {
    const [row] = await getDb()
      .insert(revaluation)
      .values({
        assetId: props.assetId,
        onDate: props.onDate,
        priceNative: props.priceNative.toFixed(),
        kind: props.kind,
        source: props.source,
        note: props.note,
      })
      .returning();
    return toProps(row);
  }
}
