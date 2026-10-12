import { AssetRepository } from './AssetRepository';
import { OperationRepository } from './OperationRepository';
import { RecurringRuleRepository } from './RecurringRuleRepository';
import { RevaluationRepository } from './RevaluationRepository';

export interface Repositories {
  assets: AssetRepository;
  operations: OperationRepository;
  revaluations: RevaluationRepository;
  rules: RecurringRuleRepository;
}

const globalForRepositories = globalThis as unknown as {
  __financeRepositories?: Repositories;
};

export function getRepositories(): Repositories {
  globalForRepositories.__financeRepositories ??= {
    assets: new AssetRepository(),
    operations: new OperationRepository(),
    revaluations: new RevaluationRepository(),
    rules: new RecurringRuleRepository(),
  };
  return globalForRepositories.__financeRepositories;
}

export {
  AssetRepository,
  OperationRepository,
  RecurringRuleRepository,
  RevaluationRepository,
};
