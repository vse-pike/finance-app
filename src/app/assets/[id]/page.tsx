'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { AssetDetailsApi } from '@/app/_lib/api';
import { apiErrorMessage, apiFetch } from '@/app/_lib/api';
import { formatDate, todayIso } from '@/app/_lib/format';
import {
  KIND_LABELS,
  VALUATION_HINTS,
  VALUATION_LABELS,
} from '@/app/_lib/labels';
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  PageHeader,
} from '@/app/_ui/kit';
import { CapitalChart } from './capital-chart';
import { OperationsPanel } from './operations-panel';
import { RevaluationsPanel } from './revaluations-panel';
import { RulesPanel } from './rules-panel';

export default function AssetPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [details, setDetails] = useState<AssetDetailsApi | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const { status, data } = await apiFetch<AssetDetailsApi>(`/api/assets/${id}`);
      if (status === 401) {
        router.replace('/login');
        return;
      }
      if (status === 404) {
        setLoadError('Актив не найден');
        return;
      }
      if (status !== 200 || !data) {
        setLoadError(apiErrorMessage(data, 'Не удалось загрузить актив'));
        return;
      }
      setDetails(data);
      setLoadError(null);
    } catch {
      setLoadError('Не удалось связаться с сервером');
    }
  }, [id, router]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (details) document.title = `${details.asset.name} — Личные финансы`;
  }, [details]);
  async function patchAsset(patch: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      const { status, data } = await apiFetch(`/api/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (status === 401) {
        router.replace('/login');
        return;
      }
      if (status !== 200) {
        setActionError(apiErrorMessage(data, 'Не удалось сохранить изменения'));
        return;
      }
      await load();
    } catch {
      setActionError('Не удалось связаться с сервером');
    } finally {
      setBusy(false);
    }
  }
  function toggleActive() {
    const asset = details?.asset;
    if (!asset || busy) return;
    if (asset.isActive) {
      if (!window.confirm('Закрыть актив? Он останется в истории, но будет помечен закрытым.')) {
        return;
      }
      void patchAsset({ isActive: false, closedOn: todayIso() });
    } else {
      void patchAsset({ isActive: true, closedOn: null });
    }
  }
  async function handleDelete() {
    const asset = details?.asset;
    if (!asset || busy) return;
    if (!window.confirm(`Удалить актив «${asset.name}»? Актив можно удалить, только пока у него нет операций.`)) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const { status, data } = await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (status === 401) {
        router.replace('/login');
        return;
      }
      if (status === 409) {
        setActionError('Сначала удалите операции этого актива.');
        return;
      }
      if (status !== 204) {
        setActionError(apiErrorMessage(data, 'Не удалось удалить актив'));
        return;
      }
      router.replace('/');
    } catch {
      setActionError('Не удалось связаться с сервером');
    } finally {
      setBusy(false);
    }
  }
  const asset = details?.asset;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-neutral-500 transition-colors hover:text-neutral-900"
      >
        ← К активам
      </Link>
      {asset ? (
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              {asset.name}
              {asset.isActive ? <Badge tone="green">Активен</Badge> : <Badge>Закрыт</Badge>}
            </span>
          }
          subtitle={`Открыт ${formatDate(asset.openedOn)}${
            asset.closedOn ? ` · закрыт ${formatDate(asset.closedOn)}` : ''
          }`}
          actions={
            <>
              <Button onClick={toggleActive} disabled={busy}>
                {asset.isActive ? 'Закрыть актив' : 'Переоткрыть'}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={busy}>
                Удалить
              </Button>
            </>
          }
        />
      ) : (
        <PageHeader title="Актив" subtitle={loadError ? null : 'Загрузка…'} />
      )}
      <div className="space-y-3">
        <ErrorNote>{actionError}</ErrorNote>
        {loadError ? <ErrorNote>{loadError}</ErrorNote> : null}
      </div>
      {loadError ? (
        <Card className="mt-6 p-8 text-center text-sm text-neutral-500">
          {loadError}.{' '}
          <Link href="/" className="text-neutral-900 underline">
            Вернуться к списку активов
          </Link>
        </Card>
      ) : null}
      {asset ? (
        <>
          <Card className="p-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Тип</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{KIND_LABELS[asset.kind]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Единица</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{asset.unit}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Валюта котировки
                </dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{asset.quoteCurrency}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Метод оценки</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">
                  {VALUATION_LABELS[asset.valuation]}
                  <span className="block text-xs text-neutral-500">
                    {VALUATION_HINTS[asset.valuation]}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Дата открытия</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{formatDate(asset.openedOn)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Дата закрытия</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">
                  {asset.closedOn ? formatDate(asset.closedOn) : '—'}
                </dd>
              </div>
              {asset.note ? (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Заметка</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-sm text-neutral-700">
                    {asset.note}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
          <div className="mt-8">
            <CapitalChart
              asset={asset}
              operations={details?.operations ?? []}
              revaluations={details?.revaluations ?? []}
            />
          </div>
          <div className="mt-8">
            <OperationsPanel
              asset={asset}
              operations={details?.operations ?? []}
              onChanged={() => void load()}
            />
          </div>
          <div className="mt-8">
            <RulesPanel
              asset={asset}
              rules={details?.rules ?? []}
              onChanged={() => void load()}
            />
          </div>
          <div className="mt-8">
            <RevaluationsPanel
              asset={asset}
              revaluations={details?.revaluations ?? []}
              onChanged={() => void load()}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
