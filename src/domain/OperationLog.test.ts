import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { OperationLog } from './OperationLog';
import type { OperationProps, OperationType } from './types';

const A = new Date('2024-01-01T00:00:00Z');
const B = new Date('2024-02-01T12:00:00Z');
const C = new Date('2024-03-01T00:00:00Z');

function op(over: Partial<OperationProps> & { ts: Date }): OperationProps {
  return {
    id: 'op-' + over.ts.toISOString(),
    assetId: 'asset-1',
    type: 'buy' as OperationType,
    qtyDelta: new Decimal(0),
    valueNative: null,
    transferId: null,
    note: null,
    ...over,
  };
}

describe('OperationLog', () => {
  it('пустой лог: количество и вложения равны нулю', () => {
    const log = new OperationLog([]);
    expect(log.quantityAt(new Date()).toNumber()).toBe(0);
    expect(log.investedAt(new Date()).toNumber()).toBe(0);
  });
  it('операции до t учитываются, после t — нет', () => {
    const log = new OperationLog([
      op({ ts: A, qtyDelta: new Decimal('2') }),
      op({ ts: C, qtyDelta: new Decimal('5') }),
    ]);
    expect(log.quantityAt(B).toNumber()).toBe(2);
    expect(log.quantityAt(C).toNumber()).toBe(7);
    expect(log.quantityAt(A).toNumber()).toBe(2);
  });
  it('граница ts = t включается', () => {
    const log = new OperationLog([op({ ts: B, qtyDelta: new Decimal('3') })]);
    expect(log.quantityAt(new Date('2024-02-01T12:00:00Z')).toNumber()).toBe(3);
    expect(log.quantityAt(new Date('2024-02-01T11:59:59.999Z')).toNumber()).toBe(0);
  });
  it('qtyDelta складываются со знаком (покупки и продажи)', () => {
    const log = new OperationLog([
      op({ ts: A, qtyDelta: new Decimal('10') }),
      op({ ts: B, qtyDelta: new Decimal('-4') }),
      op({ ts: C, qtyDelta: new Decimal('1.5') }),
    ]);
    expect(log.quantityAt(A).toNumber()).toBe(10);
    expect(log.quantityAt(B).toNumber()).toBe(6);
    expect(log.quantityAt(C).toNumber()).toBe(7.5);
  });
  it('журнал сортируется по ts, вход не мутируется', () => {
    const input = [
      op({ ts: C, qtyDelta: new Decimal('1') }),
      op({ ts: A, qtyDelta: new Decimal('2') }),
      op({ ts: B, qtyDelta: new Decimal('3') }),
    ];
    const log = new OperationLog(input);
    expect(log.operations.map((o) => o.ts)).toEqual([A, B, C]);
    expect(input.map((o) => o.ts)).toEqual([C, A, B]);
  });
  it('investedAt: только down_payment и principal_payment, valueNative=null = 0', () => {
    const log = new OperationLog([
      op({ ts: A, type: 'down_payment', qtyDelta: new Decimal('1'), valueNative: new Decimal('20000') }),
      op({ ts: A, type: 'buy', qtyDelta: new Decimal('1'), valueNative: new Decimal('999') }),
      op({ ts: B, type: 'principal_payment', qtyDelta: new Decimal('0'), valueNative: null }),
      op({ ts: B, type: 'principal_payment', qtyDelta: new Decimal('0'), valueNative: new Decimal('1500.5') }),
      op({ ts: C, type: 'fee', qtyDelta: new Decimal('0'), valueNative: new Decimal('100') }),
    ]);
    expect(log.investedAt(A).toNumber()).toBe(20000);
    expect(log.investedAt(B).toNumber()).toBe(21500.5);
    expect(log.investedAt(C).toNumber()).toBe(21500.5);
    expect(log.quantityAt(C).toNumber()).toBe(2);
  });
  it('до первой операции вложения нулевые', () => {
    const log = new OperationLog([
      op({ ts: B, type: 'down_payment', valueNative: new Decimal('5') }),
    ]);
    expect(log.investedAt(A).toNumber()).toBe(0);
  });
});
