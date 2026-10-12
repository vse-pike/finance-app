import { getRepositories } from '@/db/repositories';
import { NotFoundError } from './errors';
import { uuidString } from './validation';
import type { AssetProps } from '@/domain/types';

export interface IdRouteContext {
  params: Promise<{ id: string }>;
}

export async function requireAsset(id: string): Promise<AssetProps> {
  if (!uuidString.safeParse(id).success) {
    throw new NotFoundError('Актив не найден');
  }
  const asset = await getRepositories().assets.getById(id);
  if (!asset) throw new NotFoundError('Актив не найден');
  return asset;
}
