import { z } from 'zod';
import type {
  AssetKind,
  OperationType,
  RevaluationKind,
  ValuationMethod,
} from '@/domain/types';

const ASSET_KINDS = [
  'real_estate',
  'crypto',
  'cash',
  'deposit',
  'commodity',
  'securities',
  'other',
] as const satisfies readonly AssetKind[];

const VALUATION_METHODS = ['market', 'invested', 'manual'] as const satisfies readonly ValuationMethod[];

const OPERATION_TYPES = [
  'buy',
  'sell',
  'transfer_in',
  'transfer_out',
  'income',
  'spend',
  'fee',
  'down_payment',
  'principal_payment',
] as const satisfies readonly OperationType[];

const REVALUATION_KINDS = ['primary', 'reference'] as const satisfies readonly RevaluationKind[];

export const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Ожидается десятичное число строкой, например «12.5»');

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ожидается дата в формате YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Некорректная календарная дата');

export const isoDateTime = z.iso.datetime({ offset: true, local: true });

export const uuidString = z.uuid();

const noteString = z.string().trim().max(2000, 'Слишком длинная пометка');

export const loginSchema = z.object({
  username: z.string().min(1, 'Укажите имя пользователя'),
  password: z.string().min(1, 'Укажите пароль'),
});

export const assetCreateSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(200),
  kind: z.enum(ASSET_KINDS),
  unit: z.string().trim().min(1, 'Укажите единицу измерения').max(32),
  quoteCurrency: z.string().trim().min(1, 'Укажите валюту котировки').max(16),
  valuation: z.enum(VALUATION_METHODS).default('market'),
  openedOn: dateString.optional(),
  note: noteString.nullish(),
});

export const assetPatchSchema = z.object({
  name: z.string().trim().min(1, 'Название не может быть пустым').max(200).optional(),
  note: noteString.nullish(),
  isActive: z.boolean().optional(),
  closedOn: dateString.nullish(),
});

export const operationCreateSchema = z.object({
  ts: isoDateTime,
  type: z.enum(OPERATION_TYPES),
  qtyDelta: moneyString,
  valueNative: moneyString.optional(),
  note: noteString.nullish(),
});

export const revaluationCreateSchema = z.object({
  onDate: dateString,
  priceNative: moneyString,
  kind: z.enum(REVALUATION_KINDS).default('primary'),
  source: z.string().trim().max(64).nullish(),
  note: noteString.nullish(),
});

export const ruleCreateSchema = z.object({
  type: z.enum(OPERATION_TYPES),
  dayOfMonth: z.number().int().min(1, 'День месяца: от 1 до 28').max(28, 'День месяца: от 1 до 28'),
  qtyDelta: moneyString.default('0'),
  valueNative: moneyString.optional(),
  startDate: dateString.optional(),
  note: noteString.nullish(),
});

export const rulePatchSchema = z.object({
  isActive: z.boolean(),
});
