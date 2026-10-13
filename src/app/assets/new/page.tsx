'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AssetKind, ValuationMethod } from '@/domain/types';
import { apiFetch, apiErrorMessage } from '@/app/_lib/api';
import {
  CUSTOM_CURRENCY,
  CURRENCY_OPTIONS,
  KIND_OPTIONS,
  VALUATION_HINTS,
  VALUATION_LABELS,
} from '@/app/_lib/labels';
import {
  Button,
  Card,
  ErrorNote,
  Field,
  inputClass,
  labelClass,
  PageHeader,
} from '@/app/_ui/kit';

const VALUATION_OPTIONS = Object.entries(VALUATION_LABELS) as Array<[ValuationMethod, string]>;

export default function NewAssetPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AssetKind>('cash');
  const [unit, setUnit] = useState('');
  const [currencyChoice, setCurrencyChoice] = useState<string>('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [valuation, setValuation] = useState<ValuationMethod>('market');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isCustomCurrency = currencyChoice === CUSTOM_CURRENCY;
  const quoteCurrency = isCustomCurrency ? customCurrency.trim().toUpperCase() : currencyChoice;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!name.trim()) {
      setError('Укажите название актива');
      return;
    }
    if (!unit.trim()) {
      setError('Укажите единицу измерения');
      return;
    }
    if (!quoteCurrency) {
      setError('Укажите валюту котировки');
      return;
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      kind,
      unit: unit.trim(),
      quoteCurrency,
      valuation,
    };
    if (note.trim()) body.note = note.trim();
    setPending(true);
    setError(null);
    try {
      const { status, data } = await apiFetch<{ id?: string }>('/api/assets', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (status !== 201) {
        setError(apiErrorMessage(data, 'Не удалось создать актив'));
        return;
      }
      router.push(data?.id ? `/assets/${data.id}` : '/');
    } catch {
      setError('Не удалось связаться с сервером');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title="Новый актив" subtitle="Одна запись — одно место хранения: «Квартира на Абая», «USDT на Bybit»." />
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Field label="Название">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Квартира на Абая"
              className={inputClass}
              disabled={pending}
              autoFocus
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Тип">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AssetKind)}
                className={inputClass}
                disabled={pending}
              >
                {KIND_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Единица измерения">
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="BTC / USD / XAU / шт"
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Валюта котировки" hint="В ней выражена цена одной единицы актива">
              <select
                value={currencyChoice}
                onChange={(e) => setCurrencyChoice(e.target.value)}
                className={inputClass}
                disabled={pending}
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
                <option value={CUSTOM_CURRENCY}>Другая…</option>
              </select>
            </Field>
            {isCustomCurrency ? (
              <Field label="Другая валюта">
                <input
                  type="text"
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  placeholder="GBP"
                  className={`${inputClass} uppercase`}
                  disabled={pending}
                />
              </Field>
            ) : null}
          </div>
          <fieldset>
            <legend className={labelClass}>Метод оценки</legend>
            <div className="space-y-2">
              {VALUATION_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    valuation === value
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="valuation"
                    value={value}
                    checked={valuation === value}
                    onChange={() => setValuation(value)}
                    className="mt-0.5 accent-neutral-900"
                    disabled={pending}
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">{label}</span>
                    <span className="block text-xs text-neutral-500">{VALUATION_HINTS[value]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Заметка" hint="Необязательно">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Например: ипотека в Банке X до 2035 года"
              className={inputClass}
              disabled={pending}
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? 'Создаём…' : 'Создать актив'}
            </Button>
            <Button onClick={() => router.back()} disabled={pending}>
              Отмена
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
