import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  AssetKind,
  OperationType,
  RevaluationKind,
  ValuationMethod,
} from '@/domain/types';

export const asset = pgTable('asset', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').$type<AssetKind>().notNull(),
  unit: text('unit').notNull(),
  quoteCurrency: text('quote_currency').notNull(),
  valuation: text('valuation').$type<ValuationMethod>().notNull().default('market'),
  openedOn: date('opened_on').notNull().defaultNow(),
  closedOn: date('closed_on'),
  isActive: boolean('is_active').notNull().default(true),
  note: text('note'),
});

export const operation = pgTable(
  'operation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id').notNull().references(() => asset.id),
    ts: timestamp('ts', { withTimezone: true }).notNull(),
    type: text('type').$type<OperationType>().notNull(),
    qtyDelta: numeric('qty_delta', { precision: 38, scale: 12 }).notNull(),
    valueNative: numeric('value_native', { precision: 38, scale: 12 }),
      note: text('note'),
  },
  (t) => [index('operation_asset_ts_idx').on(t.assetId, t.ts)],
);

export const revaluation = pgTable(
  'revaluation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id').notNull().references(() => asset.id),
    onDate: date('on_date').notNull(),
    priceNative: numeric('price_native', { precision: 38, scale: 12 }).notNull(),
    kind: text('kind').$type<RevaluationKind>().notNull().default('capital'),
    source: text('source'),
    note: text('note'),
  },
  (t) => [index('revaluation_asset_date_idx').on(t.assetId, t.onDate)],
);
export const price = pgTable(
  'price',
  {
    unit: text('unit').notNull(),
    inUnit: text('in_unit').notNull(),
    onDate: date('on_date').notNull(),
    rate: numeric('rate', { precision: 38, scale: 12 }).notNull(),
    source: text('source').notNull(),
  },
  (t) => [primaryKey({ name: 'price_pk', columns: [t.unit, t.inUnit, t.onDate] })],
);
export const snapshot = pgTable(
  'snapshot',
  {
    assetId: uuid('asset_id').notNull().references(() => asset.id),
    onDate: date('on_date').notNull(),
    qty: numeric('qty', { precision: 38, scale: 12 }).notNull(),
    priceNative: numeric('price_native', { precision: 38, scale: 12 }).notNull(),
    valueNative: numeric('value_native', { precision: 38, scale: 12 }).notNull(),
    investedAmount: numeric('invested_amount', { precision: 38, scale: 12 }),
    valueUsd: numeric('value_usd', { precision: 38, scale: 12 }).notNull(),
    fxPath: jsonb('fx_path'),
  },
  (t) => [primaryKey({ name: 'snapshot_pk', columns: [t.assetId, t.onDate] })],
);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

export const recurringRule = pgTable(
  'recurring_rule',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id').notNull().references(() => asset.id),
    type: text('type').$type<OperationType>().notNull(),
    dayOfMonth: integer('day_of_month').notNull(),
    qtyDelta: numeric('qty_delta', { precision: 38, scale: 12 }).notNull(),
    valueNative: numeric('value_native', { precision: 38, scale: 12 }),
    note: text('note'),
    isActive: boolean('is_active').notNull().default(true),
    nextRunOn: date('next_run_on').notNull(),
  },
  (t) => [index('recurring_rule_asset_idx').on(t.assetId)],
);
