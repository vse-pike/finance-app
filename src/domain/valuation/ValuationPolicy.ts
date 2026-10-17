import type Decimal from 'decimal.js';
import { Money } from '../Money';
import type { Asset } from '../Asset';
import { dateKeyOf } from '../dates';
import type { RevaluationProps } from '../types';

function effectivePrimaryPrice(
  revaluations: RevaluationProps[],
  t: Date,
): Decimal | null {
  const day = dateKeyOf(t);
  let best: RevaluationProps | null = null;
  for (const r of revaluations) {
    if (r.kind !== 'capital') continue;
    if (r.onDate > day) continue;
    if (best === null || r.onDate >= best.onDate) best = r;
  }
  return best === null ? null : best.priceNative;
}

export abstract class ValuationPolicy {
  abstract valueAt(asset: Asset, t: Date): Money | null;
  investedAt(_asset: Asset, _t: Date): Money | null {
    return null;
  }
  static for(asset: Asset, revaluations: RevaluationProps[]): ValuationPolicy {
    switch (asset.props.valuation) {
      case 'invested':
        return new InvestedValuation();
      case 'manual':
        return new ManualValuation(revaluations);
      case 'market':
      default:
        return new MarketValuation(revaluations);
    }
  }
}

export class ManualValuation extends ValuationPolicy {
  constructor(private readonly revaluations: RevaluationProps[]) {
    super();
  }
  valueAt(asset: Asset, t: Date): Money | null {
    const price = effectivePrimaryPrice(this.revaluations, t);
    if (price === null) return null;
    return Money.of(
      asset.quantityAt(t).mul(price),
      asset.props.quoteCurrency,
    );
  }
}

export class MarketValuation extends ValuationPolicy {
  constructor(private readonly revaluations: RevaluationProps[]) {
    super();
  }
  valueAt(asset: Asset, t: Date): Money | null {
    const price = effectivePrimaryPrice(this.revaluations, t);
    if (price === null) return null;
    return Money.of(
      asset.quantityAt(t).mul(price),
      asset.props.quoteCurrency,
    );
  }
}

export class InvestedValuation extends ValuationPolicy {
  valueAt(asset: Asset, t: Date): Money {
    return Money.of(asset.investedAt(t), asset.props.quoteCurrency);
  }
  override investedAt(asset: Asset, t: Date): Money | null {
    return this.valueAt(asset, t);
  }
}
