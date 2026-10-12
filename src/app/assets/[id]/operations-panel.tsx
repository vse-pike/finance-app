'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AssetApi, OperationApi } from '@/app/_lib/api';
import { apiErrorMessage, apiFetch } from '@/app/_lib/api';
import type { OperationType } from '@/domain/types';
import {
  formatDateTime,
  formatDecimal,
  formatSigned,
  normalizeDecimalInput,
  nowToLocalInput,
  signOf,
} from '@/app/_lib/format';
import {
  INVESTED_OPERATION_TYPES,
  OPERATION_LABELS,
  STANDARD_OPERATION_TYPES,
} from '@/app/_lib/labels';
import {
  Button,
  ErrorNote,
  Field,
  inputClass,
  SectionCard,
  tdClass,
  thClass,
} from '@/app/_ui/kit';

function signColorClass(sign: number): string {
  if (sign > 0) return 'text-emerald-600';
  if (sign < 0) return 'text-rose-600';
  return 'text-neutral-500';
}

interface OperationsPanelProps {
  asset: AssetApi;
  operations: OperationApi[];
  onChanged: () => void;
}

export function OperationsPanel({ asset, operations, onChanged }: OperationsPanelProps) {
  const router = useRouter();
  const isInvested = asset.valuation === 'invested';
  const availableTypes: OperationType[] = isInvested
    ? INVESTED_OPERATION_TYPES
    : STANDARD_OPERATION_TYPES;
  const [type, setType] = useState<OperationType>(isInvested ? 'down_payment' : 'buy');
  const [ts, setTs] = useState(nowToLocalInput());
  const [qtyDelta, setQtyDelta] = useState(isInvested ? '0' : '');
  const [valueNative, setValueNative] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sorted = [...operations].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const qty = normalizeDecimalInput(qtyDelta, true);
    if (qty === null) {
      setError('Укажите количество числом, например 0.5 или −3');
      return;
    }
    if (!ts) {
      setError('Укажите дату и время операции');
      return;
    }
    const stamp = new Date(ts);
    if (Number.isNaN(stamp.getTime())) {
      setError('Некорректные дата и время');
      return;
    }
    let value: string | null = null;
    if (valueNative.trim()) {
      value = normalizeDecimalInput(valueNative);
      if (value === null) {
        setError('Сумма должна быть числом');
        return;
      }
    }
    const body: Record<string, unknown> = {
      ts: stamp.toISOString(),
      type,
      qtyDelta: qty,
    };
    if (value !== null) body.valueNative = value;
    if (note.trim()) body.note = note.trim();
    setPending(true);
    try {
      const { status, data } = await apiFetch(`/api/assets/${asset.id}/operations`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (status === 401) {
        router.replace('/login');
        return;
      }
      if (status !== 201) {
        setError(apiErrorMessage(data, 'Не удалось сохранить операцию'));
        return;
      }
      setQtyDelta('');
      setValueNative('');
      setNote('');
      onChanged();
    } catch {
      setError('Не удалось связаться с сервером');
    } finally {
      setPending(false);
    }
  }
  async function handleDelete(operationId: string) {
    if (deletingId) return;
    if (!window.confirm('Удалить операцию?')) return;
    setError(null);
    setDeletingId(operationId);
    try {
      const { status, data } = await apiFetch(`/api/operations/${operationId}`, {
        method: 'DELETE',
      });
      if (status === 401) {
        router.replace('/login');
        return;
      }
      if (status !== 204) {
        setError(apiErrorMessage(data, 'Не удалось удалить операцию'));
        return;
      }
      onChanged();
    } catch {
      setError('Не удалось связаться с сервером');
    } finally {
      setDeletingId(null);
    }
  }
  return (
    <div className="space-y-4">
      <SectionCard
        title="Новая операция"
        description={
          isInvested
            ? 'Для активов «по вложениям»: первоначальный взнос, платежи по телу и продажа'
            : 'Покупки, продажи, доходы, траты, комиссии и переводы между своими активами'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Тип">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as OperationType)}
                className={inputClass}
                disabled={pending}
              >
                {availableTypes.map((value) => (
                  <option key={value} value={value}>
                    {OPERATION_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Дата и время">
              <input
                type="datetime-local"
                value={ts}
                onChange={(e) => setTs(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`Количество, ${asset.unit}`}
              hint="Со знаком: покупка — плюс, продажа — минус"
            >
              <input
                type="text"
                inputMode="decimal"
                value={qtyDelta}
                onChange={(e) => setQtyDelta(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={pending}
              />
            </Field>
            <Field label={`Сумма, ${asset.quoteCurrency}`} hint="Необязательно — для учёта вложений">
              <input
                type="text"
                inputMode="decimal"
                value={valueNative}
                onChange={(e) => setValueNative(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
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
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Добавить операцию'}
          </Button>
        </form>
      </SectionCard>
      <SectionCard title="Операции" description={`Всего: ${sorted.length}`}>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Операций пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Дата</th>
                  <th className={thClass}>Тип</th>
                  <th className={`${thClass} text-right`}>Количество</th>
                  <th className={`${thClass} text-right`}>Сумма</th>
                  <th className={thClass}>Заметка</th>
                  <th className={thClass}>
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((operation) => {
                  const sign = signOf(operation.qtyDelta);
                  return (
                    <tr key={operation.id}>
                      <td className={`${tdClass} whitespace-nowrap text-neutral-600`}>
                        {formatDateTime(operation.ts)}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {OPERATION_LABELS[operation.type]}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                        <span className={signColorClass(sign)}>{formatSigned(operation.qtyDelta)}</span>{' '}
                        <span className="text-neutral-400">{asset.unit}</span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                        {operation.valueNative === null ? (
                          <span className="text-neutral-400">—</span>
                        ) : (
                          <>
                            {formatDecimal(operation.valueNative)}{' '}
                            <span className="text-neutral-400">{asset.quoteCurrency}</span>
                          </>
                        )}
                      </td>
                      <td className={`${tdClass} text-neutral-600`}>{operation.note ?? ''}</td>
                      <td className={`${tdClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => handleDelete(operation.id)}
                          disabled={deletingId !== null}
                          className="whitespace-nowrap text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline disabled:opacity-50"
                        >
                          {deletingId === operation.id ? 'Удаляем…' : 'Удалить'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
