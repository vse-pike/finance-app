import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { Money } from '../Money';
import { Asset } from '../Asset';
import {
  InvestedValuation,
  ManualValuation,
  MarketValuation,
  ValuationPolicy,
} from './ValuationPolicy';
import type { AssetProps, OperationProps, RevaluationProps } from '../types';

const assetProps = (over: Partial<AssetProps> = {}): AssetProps => ({
  id: 'asset-1',
  name: 'Тестовый актив',
  kind: 'real_estate',
  unit: 'шт',
  quoteCurrency: 'USD',
  valuation: 'market',
  openedOn: '2023-01-01',
  closedOn: null,
  isActive: true,
  note: null,
  ...over,
});

const op = (over: Partial<OperationProps> & { ts: Date }): OperationProps => ({
  id: 'op-' + over.ts.toISOString(),
  assetId: 'asset-1',
  type: 'buy',
  qtyDelta: new Decimal(0),
  valueNative: null,
  note: null,
  ...over,
});

const rev = (over: Partial<RevaluationProps> & { onDate: string }): RevaluationProps => ({
  id: 'rev-' + over.onDate,
  assetId: 'asset-1',
  priceNative: new Decimal(1),
  kind: 'capital',
  source: null,
  note: null,
  ...over,
});

const T0 = new Date('2024-01-14T23:59:59Z');
const T1 = new Date('2024-01-15T00:00:00Z');
const T2 = new Date('2024-06-01T10:00:00Z');

describe('InvestedValuation', () => {
  const asset = new Asset(assetProps({ valuation: 'invested' }), [
    op({ ts: new Date('2024-01-10T00:00:00Z'), type: 'down_payment', valueNative: new Decimal('20000') }),
    op({ ts: new Date('2024-02-10T00:00:00Z'), type: 'principal_payment', valueNative: new Decimal('500') }),
    op({ ts: new Date('2024-03-10T00:00:00Z'), type: 'principal_payment', valueNative: new Decimal('750.25') }),
    op({ ts: new Date('2024-04-10T00:00:00Z'), type: 'buy', valueNative: new Decimal('100') }),
  ]);
  const policy = new InvestedValuation();
  it('вложения растут нарастающим итогом', () => {
    expect(policy.valueAt(asset, new Date('2024-01-15T00:00:00Z'))!.toString()).toBe('20000');
    expect(policy.valueAt(asset, new Date('2024-02-15T00:00:00Z'))!.toString()).toBe('20500');
    expect(policy.valueAt(asset, new Date('2024-03-15T00:00:00Z'))!.toString()).toBe('21250.25');
  });
  it('до первого взноса — 0 и никогда не null', () => {
    const v = policy.valueAt(asset, new Date('2023-06-01T00:00:00Z'));
    expect(v).not.toBeNull();
    expect(v!.isZero()).toBe(true);
    expect(v!.currency).toBe('USD');
  });
  it('investedAt совпадает с valueAt', () => {
    const t = new Date('2024-03-15T00:00:00Z');
    expect(policy.investedAt(asset, t)!.toString()).toBe('21250.25');
  });
  it('актив без операций — ноль в quote_currency', () => {
    const empty = new Asset(assetProps({ quoteCurrency: 'KZT' }));
    const v = new InvestedValuation().valueAt(empty, new Date());
    expect(v!.isZero()).toBe(true);
    expect(v!.currency).toBe('KZT');
  });
});

describe('MarketValuation', () => {
  const asset = new Asset(assetProps({ valuation: 'market' }), [
    op({ ts: new Date('2024-01-01T00:00:00Z'), qtyDelta: new Decimal('2') }),
    op({ ts: new Date('2024-02-01T00:00:00Z'), qtyDelta: new Decimal('1') }),
  ]);
  it('переоценка до t применяется, после t — нет', () => {
    const policy = new MarketValuation([rev({ onDate: '2024-01-15', priceNative: new Decimal('100') })]);
    expect(policy.valueAt(asset, T0)).toBeNull();
    expect(policy.valueAt(asset, T1)!.toString()).toBe('200');
    expect(policy.valueAt(asset, T2)!.toString()).toBe('300');
  });
  it('из нескольких переоценок берётся последняя ≤ t', () => {
    const policy = new MarketValuation([
      rev({ onDate: '2024-01-15', priceNative: new Decimal('100') }),
      rev({ onDate: '2024-03-01', priceNative: new Decimal('150') }),
      rev({ onDate: '2024-09-01', priceNative: new Decimal('999') }),
    ]);
    expect(policy.valueAt(asset, T1)!.toString()).toBe('200');
    expect(policy.valueAt(asset, new Date('2024-03-01T00:00:00Z'))!.toString()).toBe('450');
    expect(policy.valueAt(asset, T2)!.toString()).toBe('450');
  });
  it('без переоценок — null', () => {
    expect(new MarketValuation([]).valueAt(asset, T2)).toBeNull();
  });
  it("kind='market' не участвует в оценке", () => {
    const onlyReference = new MarketValuation([
      rev({ onDate: '2024-01-15', priceNative: new Decimal('100'), kind: 'market' }),
    ]);
    expect(onlyReference.valueAt(asset, T2)).toBeNull();
    const mixed = new MarketValuation([
      rev({ onDate: '2024-01-15', priceNative: new Decimal('100'), kind: 'capital' }),
      rev({ onDate: '2024-03-01', priceNative: new Decimal('150'), kind: 'market' }),
    ]);
    expect(mixed.valueAt(asset, T2)!.toString()).toBe('300');
  });
  it('считает в quote_currency актива, дробные количества без потери точности', () => {
    const frac = new Asset(assetProps({ quoteCurrency: 'KZT' }), [
      op({ ts: new Date('2024-01-01T00:00:00Z'), qtyDelta: new Decimal('0.1') }),
    ]);
    const policy = new MarketValuation([rev({ onDate: '2024-01-01', priceNative: new Decimal('33333333.333333333333') })]);
    expect(policy.valueAt(frac, T2)!.currency).toBe('KZT');
    expect(policy.valueAt(frac, T2)!.amount.equals(new Decimal('3333333.3333333333333'))).toBe(true);
  });
});

describe('ManualValuation', () => {
  const asset = new Asset(assetProps({ valuation: 'manual' }), [
    op({ ts: new Date('2024-01-01T00:00:00Z'), qtyDelta: new Decimal('1') }),
  ]);
  it('последняя capital-переоценка ≤ t × количество', () => {
    const policy = new ManualValuation([
      rev({ onDate: '2024-01-15', priceNative: new Decimal('90000') }),
      rev({ onDate: '2024-05-01', priceNative: new Decimal('95000') }),
      rev({ onDate: '2024-05-02', priceNative: new Decimal('88888'), kind: 'market' }),
    ]);
    expect(policy.valueAt(asset, T0)).toBeNull();
    expect(policy.valueAt(asset, T1)!.toString()).toBe('90000');
    expect(policy.valueAt(asset, new Date('2024-05-01T12:00:00Z'))!.toString()).toBe('95000');
  });
  it('без переоценок — null, market не считается', () => {
    expect(new ManualValuation([]).valueAt(asset, T2)).toBeNull();
    expect(
      new ManualValuation([rev({ onDate: '2024-01-01', kind: 'market', priceNative: new Decimal('5') })])
        .valueAt(asset, T2),
    ).toBeNull();
  });
  it('при двух переоценках одной датой применяется поздняя в списке', () => {
    const policy = new ManualValuation([
      rev({ onDate: '2024-01-15', priceNative: new Decimal('1') }),
      rev({ onDate: '2024-01-15', priceNative: new Decimal('7') }),
    ]);
    expect(policy.valueAt(asset, T1)!.toString()).toBe('7');
  });
});

describe('ValuationPolicy.for', () => {
  const revaluations = [rev({ onDate: '2024-01-15', priceNative: new Decimal('10') })];
  it('выбирает стратегию по asset.props.valuation', () => {
    expect(ValuationPolicy.for(new Asset(assetProps({ valuation: 'market' })), revaluations)).toBeInstanceOf(MarketValuation);
    expect(ValuationPolicy.for(new Asset(assetProps({ valuation: 'manual' })), revaluations)).toBeInstanceOf(ManualValuation);
    expect(ValuationPolicy.for(new Asset(assetProps({ valuation: 'invested' })), revaluations)).toBeInstanceOf(InvestedValuation);
  });
  it('стратегия переоценок доступна через фабрику и работает', () => {
    const asset = new Asset(assetProps({ valuation: 'market' }), [
      op({ ts: new Date('2024-01-01T00:00:00Z'), qtyDelta: new Decimal('3') }),
    ]);
    const t = new Date('2024-02-01T00:00:00Z');
    expect(ValuationPolicy.for(asset, revaluations).valueAt(asset, t)!.toString()).toBe('30');
  });
  it('invested-политика от фабрики считает вложения', () => {
    const asset = new Asset(assetProps({ valuation: 'invested' }), [
      op({ ts: new Date('2024-01-01T00:00:00Z'), type: 'down_payment', valueNative: new Decimal('1000') }),
    ]);
    const policy = ValuationPolicy.for(asset, []);
    expect(policy.valueAt(asset, new Date('2024-02-01T00:00:00Z'))!.toString()).toBe('1000');
    expect(ValuationPolicy.for(new Asset(assetProps({ valuation: 'market' })), []).investedAt(asset, new Date())).toBeNull();
  });
});

describe('Money в оценках', () => {
  it('итог — Money с валютой актива', () => {
    const asset = new Asset(assetProps({ quoteCurrency: 'KZT', valuation: 'market' }), [
      op({ ts: new Date('2024-01-01T00:00:00Z'), qtyDelta: new Decimal('2') }),
    ]);
    const policy = new MarketValuation([rev({ onDate: '2024-01-01', priceNative: new Decimal('12.5') })]);
    const v: Money | null = policy.valueAt(asset, T2);
    expect(v).toBeInstanceOf(Money);
    expect(v!.currency).toBe('KZT');
    expect(v!.toString()).toBe('25');
  });
});
