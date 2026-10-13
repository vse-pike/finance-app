import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { asset } from '@/db/schema';
import type {
  AssetCreateProps,
  AssetProps,
  AssetRepository as IAssetRepository,
} from '@/domain/types';
import { NotFoundError } from '@/domain/errors';

type AssetRow = typeof asset.$inferSelect;

function toProps(row: AssetRow): AssetProps {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    unit: row.unit,
    quoteCurrency: row.quoteCurrency,
    valuation: row.valuation,
    openedOn: row.openedOn,
    closedOn: row.closedOn ?? null,
    isActive: row.isActive,
    note: row.note ?? null,
  };
}

export class AssetRepository implements IAssetRepository {
  async list(): Promise<AssetProps[]> {
    const rows = await getDb()
      .select()
      .from(asset)
      .orderBy(asc(asset.openedOn), asc(asset.name));
    return rows.map(toProps);
  }
  async getById(id: string): Promise<AssetProps | null> {
    const [row] = await getDb()
      .select()
      .from(asset)
      .where(eq(asset.id, id))
      .limit(1);
    return row ? toProps(row) : null;
  }
  async create(props: AssetCreateProps): Promise<AssetProps> {
    const [row] = await getDb()
      .insert(asset)
      .values({
        name: props.name,
        kind: props.kind,
        unit: props.unit,
        quoteCurrency: props.quoteCurrency,
        valuation: props.valuation,
        openedOn: props.openedOn,
        note: props.note,
      })
      .returning();
    return toProps(row);
  }
  async update(
    id: string,
    patch: Partial<Pick<AssetProps, 'name' | 'note' | 'isActive' | 'closedOn'>>,
  ): Promise<AssetProps> {
    const values: Partial<
      Pick<typeof asset.$inferInsert, 'name' | 'note' | 'isActive' | 'closedOn'>
    > = {};
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.note !== undefined) values.note = patch.note;
    if (patch.isActive !== undefined) values.isActive = patch.isActive;
    if (patch.closedOn !== undefined) values.closedOn = patch.closedOn;
    if (Object.keys(values).length === 0) {
      const current = await this.getById(id);
      if (!current) throw new NotFoundError('Актив не найден');
      return current;
    }
    const [row] = await getDb()
      .update(asset)
      .set(values)
      .where(eq(asset.id, id))
      .returning();
    if (!row) throw new NotFoundError('Актив не найден');
    return toProps(row);
  }
  async delete(id: string): Promise<void> {
    const deleted = await getDb()
      .delete(asset)
      .where(eq(asset.id, id))
      .returning({ id: asset.id });
    if (deleted.length === 0) throw new NotFoundError('Актив не найден');
  }
}
