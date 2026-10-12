'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AssetApi, RevaluationApi } from '@/app/_lib/api';
import { apiErrorMessage, apiFetch } from '@/app/_lib/api';
import { formatDate, formatDecimal, normalizeDecimalInput, todayIso } from '@/app/_lib/format';
import { REVALUATION_KIND_HINTS, REVALUATION_KIND_LABELS } from '@/app/_lib/labels';
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

const KIND_OPTIONS = Object.entries(REVALUATION_KIND_LABELS) as Array<
  [RevaluationApi['kind'], string]
>;

interface RevaluationsPanelProps {
  asset: AssetApi;
  revaluations: RevaluationApi[];
  onChanged: () => void;
}

export function RevaluationsPanel({ asset, revaluations, onChanged }: RevaluationsPanelProps) {
  const router = useRouter();
  const [onDate, setOnDate] = useState(todayIso());
  const [priceNative, setPriceNative] = useState('');
  const [kind, setKind] = useState<RevaluationApi['kind']>('primary');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sorted = [...revaluations].sort((a, b) => (a.onDate < b.onDate ? 1 : -1));
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (!onDate) {
      setError('Укажите дату переоценки');
      return;
    }
    const price = normalizeDecimalInput(priceNative);
    if (price === null) {
      setError('Укажите цену единицы числом');
      return;
    }
    const body: Record<string, unknown> = { onDate, priceNative: price, kind };
    if (source.trim()) body.source = source.trim();
    if (note.trim()) body.note = note.trim();
    setPending(true);
    try {
      const { status, data } = await apiFetch(`/api/assets/${asset.id}/revaluations`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (status === 401) {
        router.replace('/login');
        return;
      }
      if (status !== 201) {
        setError(apiErrorMessage(data, 'Не удалось сохранить переоценку'));
        return;
      }
      setPriceNative('');
      setSource('');
      setNote('');
      onChanged();
    } catch {
      setError('Не удалось связаться с сервером');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-4">
      <SectionCard
        title="Новая переоценка"
        description={`Цена одной единицы актива, ${asset.quoteCurrency}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дата">
              <input
                type="date"
                value={onDate}
                onChange={(e) => setOnDate(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </Field>
            <Field label={`Цена единицы, ${asset.quoteCurrency}`}>
              <input
                type="text"
                inputMode="decimal"
                value={priceNative}
                onChange={(e) => setPriceNative(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Вид" hint={REVALUATION_KIND_HINTS[kind]}>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as RevaluationApi['kind'])}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Источник" hint="Например: ЦАН, оценка банка">
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Необязательно"
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
            {pending ? 'Сохраняем…' : 'Добавить переоценку'}
          </Button>
        </form>
      </SectionCard>
      <SectionCard
        title="Переоценки"
        description="Цена единицы на дату: действует последняя основная переоценка, не позднее этой даты"
      >
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Переоценок пока нет. Добавьте первую, чтобы актив получил стоимость.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Дата</th>
                  <th className={`${thClass} text-right`}>Цена единицы</th>
                  <th className={thClass}>Вид</th>
                  <th className={thClass}>Источник</th>
                  <th className={thClass}>Заметка</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((revaluation) => (
                  <tr key={revaluation.id}>
                    <td className={`${tdClass} whitespace-nowrap text-neutral-600`}>
                      {formatDate(revaluation.onDate)}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                      {formatDecimal(revaluation.priceNative)}{' '}
                      <span className="text-neutral-400">{asset.quoteCurrency}</span>
                    </td>
                    <td className={tdClass}>
                      {revaluation.kind === 'primary' ? (
                        <Badge>основная</Badge>
                      ) : (
                        <Badge tone="amber">справочная</Badge>
                      )}
                    </td>
                    <td className={`${tdClass} text-neutral-600`}>{revaluation.source ?? ''}</td>
                    <td className={`${tdClass} text-neutral-600`}>{revaluation.note ?? ''}</td>
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
