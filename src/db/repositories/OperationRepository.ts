import { asc, eq } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { getDb } from '@/db/client';
import { operation } from '@/db/schema';
import type {
  OperationProps,
  OperationRepository as IOperationRepository,
} from '@/domain/types';
import { NotFoundError } from '@/lib/errors';

type OperationRow = typeof operation.$inferSelect;

function toProps(row: OperationRow): OperationProps {
  return {
    id: row.id,
    assetId: row.assetId,
    ts: row.ts,
    type: row.type,
    qtyDelta: new Decimal(row.qtyDelta),
    valueNative: row.valueNative === null ? null : new Decimal(row.valueNative),
    transferId: row.transferId ?? null,
    note: row.note ?? null,
  };
}

export class OperationRepository implements IOperationRepository {
  async listByAsset(assetId: string): Promise<OperationProps[]> {
    const rows = await getDb()
      .select()
      .from(operation)
      .where(eq(operation.assetId, assetId))
      .orderBy(asc(operation.ts), asc(operation.id));
    return rows.map(toProps);
  }
  async listAll(): Promise<OperationProps[]> {
    const rows = await getDb()
      .select()
      .from(operation)
      .orderBy(asc(operation.ts), asc(operation.id));
    return rows.map(toProps);
  }
  async add(
    props: Omit<OperationProps, 'id' | 'transferId'> & {
      transferId?: string | null;
    },
  ): Promise<OperationProps> {
    const [row] = await getDb()
      .insert(operation)
      .values({
        assetId: props.assetId,
        ts: props.ts,
        type: props.type,
        qtyDelta: props.qtyDelta.toFixed(),
        valueNative: props.valueNative === null ? null : props.valueNative.toFixed(),
        transferId: props.transferId ?? null,
        note: props.note,
      })
      .returning();
    return toProps(row);
  }
  async delete(id: string): Promise<void> {
    const deleted = await getDb()
      .delete(operation)
      .where(eq(operation.id, id))
      .returning({ id: operation.id });
    if (deleted.length === 0) throw new NotFoundError('Операция не найдена');
  }
  async hasOperations(assetId: string): Promise<boolean> {
    const rows = await getDb()
      .select({ id: operation.id })
      .from(operation)
      .where(eq(operation.assetId, assetId))
      .limit(1);
    return rows.length > 0;
  }
}
