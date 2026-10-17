import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { Asset } from './Asset';
import type { AssetProps, OperationProps } from './types';

const props = (over: Partial<AssetProps> = {}): AssetProps => ({
  id: 'asset-1',
  name: 'Квартира на Абая',
  kind: 'real_estate',
  unit: 'шт',
  quoteCurrency: 'KZT',
  valuation: 'invested',
  openedOn: '2024-01-01',
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

describe('Asset', () => {
  const operations = [
    op({ ts: new Date('2024-01-05T00:00:00Z'), type: 'down_payment', qtyDelta: new Decimal('1'), valueNative: new Decimal('20000') }),
    op({ ts: new Date('2024-02-05T00:00:00Z'), type: 'principal_payment', valueNative: new Decimal('500') }),
  ];
  it('делегирует журналу: количество и вложения на момент t', () => {
    const asset = new Asset(props(), operations);
    const before = new Date('2024-01-10T00:00:00Z');
    const after = new Date('2024-02-10T00:00:00Z');
    expect(asset.quantityAt(before).toNumber()).toBe(1);
    expect(asset.quantityAt(after).toNumber()).toBe(1);
    expect(asset.investedAt(before).toNumber()).toBe(20000);
    expect(asset.investedAt(after).toNumber()).toBe(20500);
  });
  it('операции отдаются отсортированными по ts', () => {
    const asset = new Asset(props(), operations.slice().reverse());
    expect(asset.operations.map((o) => o.ts)).toEqual([
      new Date('2024-01-05T00:00:00Z'),
      new Date('2024-02-05T00:00:00Z'),
    ]);
  });
  it('реквизиты и операции наружу не мутируют состояние', () => {
    const source = props();
    const asset = new Asset(source, operations);
    asset.props.name = 'изменено снаружи';
    source.note = 'и тут изменили';
    expect(asset.props.name).toBe('Квартира на Абая');
    expect(Object.isFrozen(asset.operations)).toBe(true);
    expect(asset.operations).toHaveLength(2);
    expect(asset.props.note).toBeNull();
  });
  describe('isOpenAt', () => {
    it('актив открыт после openedOn и до закрытия', () => {
      const asset = new Asset(props({ openedOn: '2024-01-01', closedOn: '2024-12-31' }));
      expect(asset.isOpenAt(new Date('2023-12-31T23:59:59Z'))).toBe(false);
      expect(asset.isOpenAt(new Date('2024-01-01T00:00:00Z'))).toBe(true);
      expect(asset.isOpenAt(new Date('2024-06-15T12:00:00Z'))).toBe(true);
      expect(asset.isOpenAt(new Date('2024-12-31T23:59:59Z'))).toBe(true);
      expect(asset.isOpenAt(new Date('2025-01-01T00:00:00Z'))).toBe(false);
    });
    it('без даты закрытия актив открыт бесконечно', () => {
      const asset = new Asset(props({ openedOn: '2024-01-01', closedOn: null }));
      expect(asset.isOpenAt(new Date('2099-01-01T00:00:00Z'))).toBe(true);
      expect(asset.isOpenAt(new Date('2023-01-01T00:00:00Z'))).toBe(false);
    });
  });
});
