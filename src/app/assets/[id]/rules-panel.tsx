'use client';

import { useState, type FormEvent } from 'react';
import type { AssetApi, RecurringRuleApi } from '@/app/_lib/api';
import { apiErrorMessage, apiFetch } from '@/app/_lib/api';
import { formatDate, formatDecimal, normalizeDecimalInput, todayIso } from '@/app/_lib/format';
import {
  INVESTED_OPERATION_TYPES,
  OPERATION_LABELS,
  STANDARD_OPERATION_TYPES,
} from '@/app/_lib/labels';
import type { OperationType } from '@/domain/types';
import {
  Badge,
  Button,
  ErrorNote,
  Field,
  inputClass,
  SectionCard,
  tdClass,
  thClass,
} from '@/app/_ui/kit';

interface RulesPanelProps {
  asset: AssetApi;
  rules: RecurringRuleApi[];
  onChanged: () => void;
}

export function RulesPanel({ asset, rules, onChanged }: RulesPanelProps) {
  const invested = asset.valuation === 'invested';
  const typeOptions: OperationType[] = invested
    ? INVESTED_OPERATION_TYPES
    : STANDARD_OPERATION_TYPES;
  const [type, setType] = useState<OperationType>(invested ? 'principal_payment' : 'buy');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [startDate, setStartDate] = useState(todayIso());
  const [qtyDelta, setQtyDelta] = useState('0');
  const [valueNative, setValueNative] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const day = Number(dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      setError('День месяца: число от 1 до 28');
      return;
    }
    const qty = normalizeDecimalInput(qtyDelta, true);
    if (qty === null) {
      setError('Количество: число (можно 0)');
      return;
    }
    const value = valueNative.trim() ? normalizeDecimalInput(valueNative) : null;
    if (valueNative.trim() && value === null) {
      setError('Сумма: число');
      return;
    }
    const body: Record<string, unknown> = { type, dayOfMonth: day, qtyDelta: qty };
    if (value !== null) body.valueNative = value;
    if (startDate) body.startDate = startDate;
    if (note.trim()) body.note = note.trim();
    setPending(true);
    try {
      const { status, data } = await apiFetch(`/api/assets/${asset.id}/rules`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (status !== 201) {
        setError(apiErrorMessage(data, 'Не удалось сохранить правило'));
        return;
      }
      setValueNative('');
      setNote('');
      onChanged();
    } catch {
      setError('Не удалось связаться с сервером');
    } finally {
      setPending(false);
    }
  }

  async function toggle(rule: RecurringRuleApi) {
    setError(null);
    try {
      const { status, data } = await apiFetch(`/api/rules/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (status !== 200) {
        setError(apiErrorMessage(data, 'Не удалось изменить правило'));
        return;
      }
      onChanged();
    } catch {
      setError('Не удалось связаться с сервером');
    }
  }

  async function remove(rule: RecurringRuleApi) {
    if (!window.confirm('Удалить правило? Уже созданные операции останутся.')) return;
    setError(null);
    try {
      const { status, data } = await apiFetch(`/api/rules/${rule.id}`, { method: 'DELETE' });
      if (status !== 204) {
        setError(apiErrorMessage(data, 'Не удалось удалить правило'));
        return;
      }
      onChanged();
    } catch {
      setError('Не удалось связаться с сервером');
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Новое правило"
        description="Каждого N-го числа месяца актив обновляется сам. Пропущенные месяцы создадутся задним числом."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Тип операции">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as OperationType)}
                className={inputClass}
                disabled={pending}
              >
                {typeOptions.map((value) => (
                  <option key={value} value={value}>
                    {OPERATION_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="День месяца" hint="От 1 до 28">
              <input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Начать с" hint="Например, с даты первого платежа по ипотеке">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </Field>
            <Field label={`Сумма, ${asset.quoteCurrency}`} hint="Необязательно">
              <input
                type="text"
                inputMode="decimal"
                value={valueNative}
                onChange={(e) => setValueNative(e.target.value)}
                placeholder="300000"
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Количество" hint={invested ? 'Обычно 0 — меняется только сумма' : 'Со знаком: покупка — плюс, продажа — минус'}>
              <input
                type="text"
                inputMode="decimal"
                value={qtyDelta}
                onChange={(e) => setQtyDelta(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </Field>
            <Field label="Заметка">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Необязательно"
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Добавить правило'}
          </Button>
        </form>
      </SectionCard>
      <SectionCard title="Правила" description="Автооперации создаются раз в час и при запуске сервера">
        {rules.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Правил пока нет. Добавьте первое — например, ежемесячный платёж по ипотеке.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Тип</th>
                  <th className={thClass}>День месяца</th>
                  <th className={`${thClass} text-right`}>Количество</th>
                  <th className={`${thClass} text-right`}>Сумма</th>
                  <th className={thClass}>Следующий</th>
                  <th className={thClass}>Статус</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className={rule.isActive ? '' : 'text-neutral-400'}>
                    <td className={`${tdClass} whitespace-nowrap`}>{OPERATION_LABELS[rule.type]}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{rule.dayOfMonth}-е число</td>
                    <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                      {formatDecimal(rule.qtyDelta)}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                      {rule.valueNative === null ? (
                        '—'
                      ) : (
                        <>
                          {formatDecimal(rule.valueNative)}{' '}
                          <span className="text-neutral-400">{asset.quoteCurrency}</span>
                        </>
                      )}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-neutral-600`}>
                      {formatDate(rule.nextRunOn)}
                    </td>
                    <td className={tdClass}>
                      {rule.isActive ? <Badge tone="green">Включена</Badge> : <Badge>Выключена</Badge>}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <div className="flex gap-1.5">
                        <Button onClick={() => toggle(rule)} disabled={pending}>
                          {rule.isActive ? 'Выключить' : 'Включить'}
                        </Button>
                        <Button variant="danger" onClick={() => remove(rule)} disabled={pending}>
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
