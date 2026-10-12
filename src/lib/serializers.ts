import type {
  AssetProps,
  OperationProps,
  RecurringRuleProps,
  RevaluationProps,
} from '@/domain/types';

export interface AssetJson {
  id: string;
  name: string;
  kind: string;
  unit: string;
  quoteCurrency: string;
  valuation: string;
  openedOn: string;
  closedOn: string | null;
  isActive: boolean;
  note: string | null;
}

export interface OperationJson {
  id: string;
  assetId: string;
  ts: string;
  type: string;
  qtyDelta: string;
  valueNative: string | null;
  transferId: string | null;
  note: string | null;
}

export interface RevaluationJson {
  id: string;
  assetId: string;
  onDate: string;
  priceNative: string;
  kind: string;
  source: string | null;
  note: string | null;
}

export function serializeAsset(asset: AssetProps): AssetJson {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    unit: asset.unit,
    quoteCurrency: asset.quoteCurrency,
    valuation: asset.valuation,
    openedOn: asset.openedOn,
    closedOn: asset.closedOn,
    isActive: asset.isActive,
    note: asset.note,
  };
}

export function serializeOperation(operation: OperationProps): OperationJson {
  return {
    id: operation.id,
    assetId: operation.assetId,
    ts: operation.ts.toISOString(),
    type: operation.type,
    qtyDelta: operation.qtyDelta.toFixed(),
    valueNative:
      operation.valueNative === null ? null : operation.valueNative.toFixed(),
    transferId: operation.transferId,
    note: operation.note,
  };
}

export function serializeRevaluation(revaluation: RevaluationProps): RevaluationJson {
  return {
    id: revaluation.id,
    assetId: revaluation.assetId,
    onDate: revaluation.onDate,
    priceNative: revaluation.priceNative.toFixed(),
    kind: revaluation.kind,
    source: revaluation.source,
    note: revaluation.note,
  };
}

export interface RecurringRuleJson {
  id: string;
  assetId: string;
  type: string;
  dayOfMonth: number;
  qtyDelta: string;
  valueNative: string | null;
  note: string | null;
  isActive: boolean;
  nextRunOn: string;
}

export function serializeRule(rule: RecurringRuleProps): RecurringRuleJson {
  return {
    id: rule.id,
    assetId: rule.assetId,
    type: rule.type,
    dayOfMonth: rule.dayOfMonth,
    qtyDelta: rule.qtyDelta.toFixed(),
    valueNative: rule.valueNative === null ? null : rule.valueNative.toFixed(),
    note: rule.note,
    isActive: rule.isActive,
    nextRunOn: rule.nextRunOn,
  };
}
