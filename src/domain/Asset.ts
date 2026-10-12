import Decimal from 'decimal.js';
import { OperationLog } from './OperationLog';
import { isDayOnOrAfter, isDayOnOrBefore } from './dates';
import type { AssetProps, OperationProps } from './types';

export class Asset {
  private readonly _props: AssetProps;
  private readonly log: OperationLog;
  constructor(props: AssetProps, operations: OperationProps[] = []) {
    this._props = { ...props };
    this.log = new OperationLog(operations);
  }
  get props(): AssetProps {
    return { ...this._props };
  }
  get operations(): readonly OperationProps[] {
    return this.log.operations;
  }
  quantityAt(t: Date): Decimal {
    return this.log.quantityAt(t);
  }
  investedAt(t: Date): Decimal {
    return this.log.investedAt(t);
  }
  isOpenAt(t: Date): boolean {
    if (!isDayOnOrAfter(t, this._props.openedOn)) return false;
    return this._props.closedOn === null || isDayOnOrBefore(t, this._props.closedOn);
  }
}
