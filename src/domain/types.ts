import type Decimal from 'decimal.js';

export type AssetKind =
  | 'real_estate'
  | 'crypto'
  | 'cash'
  | 'deposit'
  | 'commodity'
  | 'securities';

export type ValuationMethod = 'market' | 'invested' | 'manual';

export type OperationType =
  | 'buy'
  | 'sell'
  | 'transfer_in'
  | 'transfer_out'
  | 'income'
  | 'spend'
  | 'fee'
  | 'down_payment'
  | 'principal_payment';

export type RevaluationKind = 'primary' | 'reference';

export interface AssetProps {
  id: string;
  name: string;
  kind: AssetKind;
  unit: string;
  quoteCurrency: string;
  valuation: ValuationMethod;
  openedOn: string;
  closedOn: string | null;
  isActive: boolean;
  note: string | null;
}

export interface OperationProps {
  id: string;
  assetId: string;
  ts: Date;
  type: OperationType;
  qtyDelta: Decimal;
  valueNative: Decimal | null;
  transferId: string | null;
  note: string | null;
}

export interface RevaluationProps {
  id: string;
  assetId: string;
  onDate: string;
  priceNative: Decimal;
  kind: RevaluationKind;
  source: string | null;
  note: string | null;
}

export interface AssetCreateProps {
  name: string;
  kind: AssetKind;
  unit: string;
  quoteCurrency: string;
  valuation: ValuationMethod;
  openedOn?: string;
  note: string | null;
}

export interface AssetRepository {
  list(): Promise<AssetProps[]>;
  getById(id: string): Promise<AssetProps | null>;
  create(props: AssetCreateProps): Promise<AssetProps>;
  update(id: string, patch: Partial<Pick<AssetProps, 'name' | 'note' | 'isActive' | 'closedOn'>>): Promise<AssetProps>;
  delete(id: string): Promise<void>;
}

export interface OperationRepository {
  listByAsset(assetId: string): Promise<OperationProps[]>;
  add(
    props: Omit<OperationProps, 'id' | 'transferId'> & { transferId?: string | null },
  ): Promise<OperationProps>;
  delete(id: string): Promise<void>;
}

export interface RevaluationRepository {
  listByAsset(assetId: string): Promise<RevaluationProps[]>;
  add(
    props: Omit<RevaluationProps, 'id'>,
  ): Promise<RevaluationProps>;
}

export interface RecurringRuleProps {
  id: string;
  assetId: string;
  type: OperationType;
  dayOfMonth: number;
  qtyDelta: Decimal;
  valueNative: Decimal | null;
  note: string | null;
  isActive: boolean;
  nextRunOn: string;
}

export interface RecurringRuleRepository {
  listByAsset(assetId: string): Promise<RecurringRuleProps[]>;
  listActive(): Promise<RecurringRuleProps[]>;
  add(props: Omit<RecurringRuleProps, 'id'>): Promise<RecurringRuleProps>;
  setActive(id: string, isActive: boolean): Promise<RecurringRuleProps>;
  updateNextRunOn(id: string, nextRunOn: string): Promise<void>;
  delete(id: string): Promise<void>;
}
