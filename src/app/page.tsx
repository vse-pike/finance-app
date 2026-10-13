'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, apiErrorMessage, type AssetApi } from '@/app/_lib/api';
import { formatDecimal } from '@/app/_lib/format';
import { KIND_LABELS, VALUATION_LABELS } from '@/app/_lib/labels';
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  LinkButton,
  PageHeader,
  tdClass,
  thClass,
} from '@/app/_ui/kit';

export default function DashboardPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { status, data } = await apiFetch<AssetApi[]>('/api/assets');
        if (cancelled) return;
        if (status !== 200 || !Array.isArray(data)) {
          setError(apiErrorMessage(data, 'Не удалось загрузить активы'));
          setAssets([]);
          return;
        }
        setAssets(data);
      } catch {
        if (!cancelled) {
          setError('Не удалось связаться с сервером');
          setAssets([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  const sorted = [...(assets ?? [])];
  sorted.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.openedOn !== b.openedOn) return a.openedOn < b.openedOn ? 1 : -1;
    return a.name.localeCompare(b.name, 'ru');
  });
  const activeCount = (assets ?? []).filter((a) => a.isActive).length;
  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
    }
    router.replace('/login');
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Личные финансы"
        subtitle={
          assets === null
            ? 'Загрузка…'
            : `Активов: ${assets.length}, активных: ${activeCount}. Кросс-валютные итоги появятся позже.`
        }
        actions={
          <>
            <LinkButton href="/assets/new" variant="primary">
              Добавить актив
            </LinkButton>
            <Button onClick={handleLogout}>Выйти</Button>
          </>
        }
      />
      <ErrorNote>{error}</ErrorNote>
      {assets !== null && !error ? (
        <Card>
          <div className="overflow-x-auto">
            {sorted.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-neutral-500">
                  Пока нет ни одного актива. Добавьте первый — квартиру, счёт, крипту.
                </p>
                <LinkButton href="/assets/new" variant="primary" className="mt-4">
                  Добавить актив
                </LinkButton>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>Актив</th>
                    <th className={thClass}>Тип</th>
                    <th className={thClass}>Метод оценки</th>
                    <th className={`${thClass} text-right`}>Количество</th>
                    <th className={`${thClass} text-right`}>Вложено</th>
                    <th className={`${thClass} text-right`}>Последняя оценка</th>
                    <th className={thClass}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => router.push(`/assets/${asset.id}`)}
                      className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                        asset.isActive ? '' : 'text-neutral-400'
                      }`}
                    >
                      <td className={tdClass}>
                        <span
                          className={`font-medium ${asset.isActive ? 'text-neutral-900' : ''}`}
                        >
                          {asset.name}
                        </span>
                        {asset.note ? (
                          <span className="mt-0.5 block max-w-xs truncate text-xs text-neutral-400">
                            {asset.note}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{KIND_LABELS[asset.kind]}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {VALUATION_LABELS[asset.valuation]}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                        {formatDecimal(asset.qty)} <span className="text-neutral-400">{asset.unit}</span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                        {asset.invested === null || asset.invested === undefined ? (
                          '—'
                        ) : (
                          <>
                            {formatDecimal(asset.invested)}{' '}
                            <span className="text-neutral-400">{asset.quoteCurrency}</span>
                          </>
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-right tabular-nums`}>
                        {asset.lastValueNative === null || asset.lastValueNative === undefined ? (
                          '—'
                        ) : (
                          <>
                            {formatDecimal(asset.lastValueNative)}{' '}
                            <span className="text-neutral-400">{asset.quoteCurrency}</span>
                          </>
                        )}
                      </td>
                      <td className={tdClass}>
                        {asset.isActive ? (
                          <Badge tone="green">Активен</Badge>
                        ) : (
                          <Badge>Закрыт</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      ) : null}
    </main>
  );
}
