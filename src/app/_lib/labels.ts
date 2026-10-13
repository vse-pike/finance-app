import type {
  AssetKind,
  OperationType,
  RevaluationKind,
  ValuationMethod,
} from '@/domain/types';

export const KIND_LABELS: Record<AssetKind, string> = {
  real_estate: 'Недвижимость',
  crypto: 'Крипта',
  cash: 'Наличные',
  deposit: 'Депозит',
  commodity: 'Коммодити',
  securities: 'Бумаги',
};

export const KIND_OPTIONS = Object.entries(KIND_LABELS) as Array<[AssetKind, string]>;

export const VALUATION_LABELS: Record<ValuationMethod, string> = {
  market: 'По рынку',
  invested: 'По вложениям',
  manual: 'Вручную',
};

export const VALUATION_HINTS: Record<ValuationMethod, string> = {
  market: 'Цена единицы берётся из переоценок',
  invested: 'Ипотека: первоначальный взнос + погашенное тело',
  manual: 'Стоимость задаёте вы сами',
};

export const OPERATION_LABELS: Record<OperationType, string> = {
  buy: 'Покупка',
  sell: 'Продажа',
  income: 'Доход',
  spend: 'Трата',
  fee: 'Комиссия',
  transfer_in: 'Перевод в',
  transfer_out: 'Перевод из',
  down_payment: 'Первоначальный взнос',
  principal_payment: 'Платёж по телу',
};

export const INVESTED_OPERATION_TYPES: OperationType[] = [
  'down_payment',
  'principal_payment',
  'sell',
];

export const STANDARD_OPERATION_TYPES: OperationType[] = [
  'buy',
  'sell',
  'income',
  'spend',
  'fee',
  'transfer_in',
  'transfer_out',
];

export const REVALUATION_KIND_LABELS: Record<RevaluationKind, string> = {
  primary: 'Основная',
  reference: 'Справочная',
};

export const REVALUATION_KIND_HINTS: Record<RevaluationKind, string> = {
  primary: 'Входит в капитал',
  reference: 'Не входит в капитал',
};

export const CURRENCY_OPTIONS = ['USD', 'KZT', 'RUB', 'EUR'] as const;

export const CUSTOM_CURRENCY = '__other';
