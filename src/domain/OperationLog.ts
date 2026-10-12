import Decimal from 'decimal.js';
import type { OperationProps, OperationType } from './types';

const INVESTMENT_TYPES: ReadonlySet<OperationType> = new Set<OperationType>([
  'down_payment',
  'principal_payment',
]);

export class OperationLog {
  private readonly items: readonly OperationProps[];

  constructor(operations: OperationProps[] = []) {
    this.items = Object.freeze(
      [...operations].sort((a, b) => a.ts.getTime() - b.ts.getTime()),
    );
  }

  get operations(): readonly OperationProps[] {
    return this.items;
  }

  quantityAt(t: Date): Decimal {
    let total = new Decimal(0);
    for (const op of this.items) {
      if (op.ts.getTime() > t.getTime()) break;
      total = total.plus(op.qtyDelta);
    }
    return total;
  }

  investedAt(t: Date): Decimal {
    let total = new Decimal(0);
    for (const op of this.items) {
      if (op.ts.getTime() > t.getTime()) break;
      if (!INVESTMENT_TYPES.has(op.type)) continue;
      if (op.valueNative === null) continue;
      total = total.plus(op.valueNative);
    }
    return total;
  }
}
