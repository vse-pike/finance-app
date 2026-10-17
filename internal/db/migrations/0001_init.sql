create table asset (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('real_estate','crypto','cash','deposit','commodity','securities')),
  unit text not null,
  quote_currency text not null,
  valuation text not null default 'market' check (valuation in ('market','invested','manual')),
  opened_on date not null default current_date,
  closed_on date,
  is_active boolean not null default true,
  note text
);

create table operation (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references asset(id),
  ts timestamptz not null,
  type text not null check (type in ('buy','sell','down_payment','principal_payment')),
  qty_delta numeric(38,12) not null,
  value_native numeric(38,12),
  note text
);
create index operation_asset_ts_idx on operation (asset_id, ts);

create table revaluation (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references asset(id),
  on_date date not null,
  price_native numeric(38,12) not null,
  kind text not null default 'capital' check (kind in ('capital','market')),
  source text,
  note text
);
create index revaluation_asset_date_idx on revaluation (asset_id, on_date);

create table price (
  unit text not null,
  in_unit text not null,
  on_date date not null,
  rate numeric(38,12) not null,
  source text not null,
  primary key (unit, in_unit, on_date)
);

create table recurring_rule (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references asset(id),
  type text not null check (type in ('buy','sell','down_payment','principal_payment')),
  day_of_month int not null check (day_of_month between 1 and 31),
  qty_delta numeric(38,12) not null default 0,
  value_native numeric(38,12),
  note text,
  is_active boolean not null default true,
  next_run_on date not null
);

create table settings (
  key text primary key,
  value jsonb not null
);

create view asset_summary as
select
  a.id,
  a.name,
  a.kind,
  a.unit,
  a.quote_currency,
  a.valuation,
  a.is_active,
  a.opened_on,
  coalesce(sum(o.qty_delta), 0) as qty,
  coalesce(sum(case when o.type in ('down_payment','principal_payment') then coalesce(o.value_native, 0) else 0 end), 0) as invested
from asset a
left join operation o on o.asset_id = a.id and o.ts <= now()
group by a.id;

create function materialize_recurring_rules(as_of date) returns integer
language plpgsql as $$
declare
  rule record;
  due date;
  created int := 0;
  y int;
  m int;
  next_day date;
begin
  for rule in select * from recurring_rule where is_active loop
    while rule.next_run_on <= as_of loop
      due := rule.next_run_on;
      insert into operation (asset_id, ts, type, qty_delta, value_native, note)
      values (
        rule.asset_id,
        due::timestamp + interval '12 hours',
        rule.type,
        rule.qty_delta,
        rule.value_native,
        rule.note
      );
      y := extract(year from due)::int;
      m := extract(month from due)::int;
      if m = 12 then
        y := y + 1;
        m := 1;
      else
        m := m + 1;
      end if;
      next_day := (make_date(y, m, 1) + interval '1 month - 1 day')::date;
      if extract(day from next_day)::int > rule.day_of_month then
        next_day := make_date(y, m, rule.day_of_month);
      end if;
      update recurring_rule set next_run_on = next_day where id = rule.id;
      rule.next_run_on := next_day;
      created := created + 1;
    end loop;
  end loop;
  return created;
end $$;
