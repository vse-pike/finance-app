import { todayIso, nextOccurrenceAfter } from '@/domain/dates';
import { getRepositories } from '@/db/repositories';
import type { RecurringRuleProps } from '@/domain/types';

const MAX_CATCH_UP = 1200;
const HOUR_MS = 60 * 60 * 1000;

async function materializeRule(rule: RecurringRuleProps): Promise<number> {
  const today = todayIso();
  const { operations, rules } = getRepositories();
  let created = 0;
  while (rule.nextRunOn <= today && created < MAX_CATCH_UP) {
    const dueOn = rule.nextRunOn;
    await operations.add({
      assetId: rule.assetId,
      ts: new Date(`${dueOn}T12:00:00Z`),
      type: rule.type,
      qtyDelta: rule.qtyDelta,
      valueNative: rule.valueNative,
      note: rule.note,
    });
    rule.nextRunOn = nextOccurrenceAfter(dueOn, rule.dayOfMonth);
    await rules.updateNextRunOn(rule.id, rule.nextRunOn);
    created += 1;
  }
  return created;
}

export async function materializeAll(): Promise<number> {
  try {
    const { rules } = getRepositories();
    const active = await rules.listActive();
    let total = 0;
    for (const rule of active) {
      try {
        total += await materializeRule(rule);
      } catch (error) {
        console.error(`Не удалось создать автоплатёж по правилу ${rule.id}`, error);
      }
    }
    return total;
  } catch (error) {
    console.error('Не удалось прочитать правила автообновления', error);
    return 0;
  }
}

const globalForJob = globalThis as unknown as { __financeRecurringJob?: boolean };

export function startRecurringJob(): void {
  if (globalForJob.__financeRecurringJob) return;
  globalForJob.__financeRecurringJob = true;
  void materializeAll();
  setInterval(() => void materializeAll(), HOUR_MS);
}
