import Decimal from 'decimal.js';
import { OperationLog } from '@/domain/OperationLog';
import { dateKeyOf } from '@/domain/dates';
import type {
  AssetProps,
  OperationProps,
  RevaluationProps,
} from '@/domain/types';

export interface AssetMetrics {
  qty: string;
  invested: string | null;
  lastValueNative: string | null;
}

export function computeAssetMetrics(
  asset: AssetProps,
  operations: readonly OperationProps[],
  revaluations: readonly RevaluationProps[],
  now: Date = new Date(),
): AssetMetrics {
  const log = new OperationLog([...operations]);
  const qty = log.quantityAt(now);
  const today = dateKeyOf(now);
  let invested: Decimal | null = null;
  let lastValueNative: Decimal | null = null;
  if (asset.valuation === 'invested') {
    invested = log.investedAt(now);
    lastValueNative = invested;
  } else {
    let primary: RevaluationProps | null = null;
    for (const revaluation of revaluations) {
      if (revaluation.kind !== 'primary') continue;
      if (revaluation.onDate > today) continue;
      if (primary === null || revaluation.onDate > primary.onDate) {
        primary = revaluation;
      }
    }
    lastValueNative = primary === null ? null : primary.priceNative.mul(qty);
  }
  return {
    qty: qty.toFixed(),
    invested: invested === null ? null : invested.toFixed(),
    lastValueNative: lastValueNative === null ? null : lastValueNative.toFixed(),
  };
}
