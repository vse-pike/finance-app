import { asc, eq } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { getDb } from '@/db/client';
import { recurringRule } from '@/db/schema';
import type {
  RecurringRuleProps,
  RecurringRuleRepository as IRecurringRuleRepository,
} from '@/domain/types';
import { NotFoundError } from '@/domain/errors';

type RuleRow = typeof recurringRule.$inferSelect;

function toProps(row: RuleRow): RecurringRuleProps {
  return {
    id: row.id,
    assetId: row.assetId,
    type: row.type,
    dayOfMonth: row.dayOfMonth,
    qtyDelta: new Decimal(row.qtyDelta),
    valueNative: row.valueNative === null ? null : new Decimal(row.valueNative),
    note: row.note ?? null,
    isActive: row.isActive,
    nextRunOn: row.nextRunOn,
  };
}

export class RecurringRuleRepository implements IRecurringRuleRepository {
  async listByAsset(assetId: string): Promise<RecurringRuleProps[]> {
    const rows = await getDb()
      .select()
      .from(recurringRule)
      .where(eq(recurringRule.assetId, assetId))
      .orderBy(asc(recurringRule.dayOfMonth), asc(recurringRule.id));
    return rows.map(toProps);
  }

  async listActive(): Promise<RecurringRuleProps[]> {
    const rows = await getDb()
      .select()
      .from(recurringRule)
      .where(eq(recurringRule.isActive, true))
      .orderBy(asc(recurringRule.nextRunOn));
    return rows.map(toProps);
  }

  async add(props: Omit<RecurringRuleProps, 'id'>): Promise<RecurringRuleProps> {
    const [row] = await getDb()
      .insert(recurringRule)
      .values({
        assetId: props.assetId,
        type: props.type,
        dayOfMonth: props.dayOfMonth,
        qtyDelta: props.qtyDelta.toFixed(),
        valueNative: props.valueNative === null ? null : props.valueNative.toFixed(),
        note: props.note,
        isActive: props.isActive,
        nextRunOn: props.nextRunOn,
      })
      .returning();
    return toProps(row);
  }

  async setActive(id: string, isActive: boolean): Promise<RecurringRuleProps> {
    const [row] = await getDb()
      .update(recurringRule)
      .set({ isActive })
      .where(eq(recurringRule.id, id))
      .returning();
    if (!row) throw new NotFoundError('Правило не найдено');
    return toProps(row);
  }

  async updateNextRunOn(id: string, nextRunOn: string): Promise<void> {
    await getDb()
      .update(recurringRule)
      .set({ nextRunOn })
      .where(eq(recurringRule.id, id));
  }

  async delete(id: string): Promise<void> {
    const deleted = await getDb()
      .delete(recurringRule)
      .where(eq(recurringRule.id, id))
      .returning({ id: recurringRule.id });
    if (deleted.length === 0) throw new NotFoundError('Правило не найдено');
  }
}
