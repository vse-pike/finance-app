import type {
  AssetKind,
  OperationType,
  RevaluationKind,
  ValuationMethod,
} from '@/domain/types';

export interface AssetApi {
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
  qty?: string;
  invested?: string | null;
  lastValueNative?: string | null;
}

export interface OperationApi {
  id: string;
  assetId: string;
  ts: string;
  type: OperationType;
  qtyDelta: string;
  valueNative: string | null;
  note: string | null;
}

export interface RevaluationApi {
  id: string;
  assetId: string;
  onDate: string;
  priceNative: string;
  kind: RevaluationKind;
  source: string | null;
  note: string | null;
}

export interface RecurringRuleApi {
  id: string;
  assetId: string;
  type: OperationType;
  dayOfMonth: number;
  qtyDelta: string;
  valueNative: string | null;
  note: string | null;
  isActive: boolean;
  nextRunOn: string;
}

export interface AssetDetailsApi {
  asset: AssetApi;
  operations: OperationApi[];
  revaluations: RevaluationApi[];
  rules: RecurringRuleApi[];
}

export interface ApiResult<T> {
  status: number;
  data: T | null;
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { ...init, cache: 'no-store', headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) } });
  if (res.status === 204) return { status: 204, data: null };
  let data: T | null = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }
  return { status: res.status, data };
}

export function apiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['error', 'message']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return fallback;
}
