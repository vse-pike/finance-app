# Личные финансы: учёт капитала

Персональный сервис для одного человека. Учет активов разных типов (недвижимость, крипта,
наличные, депозиты, коммодити, бумаги) в разных валютах с историческими курсами и аналитикой роста.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Интерфейс | Веб (PWA, ставится на телефон). Бот позже как тонкий клиент к API, если понадобится |
| Стек | TypeScript, Next.js (App Router): UI + API в одном приложении, Drizzle ORM, recharts |
| БД | PostgreSQL на домашней инфре, рядом в docker-compose |
| Объём v1 | Только капитал: активы, снепшоты, курсы, разложение роста. Кэшфлоу — потом |
| Стиль | ООП: сущности, value objects, стратегии оценки, репозитории. Домен не знает про БД и HTTP |
| Стиль кода | Без комментариев, максимально простой императивный код (без функциональщины) — легко читать и ревьюить |
| Доступ | Cloudflare Tunnel (cloudflared, без проброса портов) + Cloudflare Access + своя сессия в приложении |

## Доменная модель

Три слоя, разделённые намеренно:

```
стоимость(t) = количество(t) × цена_единицы(t) × fx(t → валюта отображения)
```

- **Количество (номинал)** меняется только операциями (`operation`) — событийная модель,
  ничего не мутируется задним числом.
- **Цена единицы** приходит из внешних источников (ликвидные активы, ежедневно) или из
  ручных переоценок (недвижимость, ступенчатая функция «последняя переоценка ≤ t»).
- **Курс** — из единой таблицы котировок `price`: FX, крипта и коммодити — одна сущность
  «сколько стоит 1 X в Y на дате». Конвертация любой пары — через граф пар (BTC→USD→KZT),
  кратчайший путь по числу пересадок. Курс на дату, которой нет, — последний ≤ даты.

### Схема БД

```sql
create table asset (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,            -- «Квартира на Абая», «USDT на Bybit»
  kind           text not null check (kind in
                   ('real_estate','crypto','cash','deposit','commodity','securities','other')),
  unit           text not null,            -- BTC, USD, XAU, «шт»
  quote_currency text not null,            -- в чём выражена цена единицы (KZT, USD…)
  valuation      text not null default 'market'
                   check (valuation in ('market','invested','manual')),
  opened_on      date not null,
  closed_on      date,
  is_active      boolean not null default true,
  note           text
);

create table operation (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references asset(id),
  ts           timestamptz not null,
  type         text not null check (type in
                 ('buy','sell',                       -- внешний край (из жизни / в жизнь)
                  'transfer_in','transfer_out',       -- между своими активами (связка transfer_id)
                  'income','spend','fee',             -- проценты, комиссии
                  'down_payment','principal_payment')), -- вложения в invested-активы
  qty_delta    numeric(38,12) not null,
  value_native numeric(38,12),            -- сумма в quote_currency (для учёта вложений)
  transfer_id  uuid,                      -- связка пары операций обмена
  note         text
);
create index on operation (asset_id, ts);

create table revaluation (                -- ручные переоценки (недвижимость и manual)
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references asset(id),
  on_date       date not null,
  price_native  numeric(38,12) not null,  -- цена единицы в quote_currency
  kind          text not null default 'primary'
                 check (kind in ('primary','reference')),
                -- reference: справочная рыночная линия, в капитал и итоги не входит
  source        text,
  note          text
);
create index on revaluation (asset_id, on_date);

create table price (                      -- FX + крипта + коммодити, единая таблица
  unit     text not null,
  in_unit  text not null,
  on_date  date not null,
  rate     numeric(38,12) not null,
  source   text not null,               -- 'nbk' | 'cbr' | 'binance' | 'manual' | …
  primary key (unit, in_unit, on_date)
);

create table snapshot (                   -- ночной снимок; графики читают только отсюда
  asset_id        uuid not null references asset(id),
  on_date         date not null,
  qty             numeric(38,12) not null,
  price_native    numeric(38,12) not null,
  value_native    numeric(38,12) not null,
  invested_amount numeric(38,12),         -- для valuation='invested'
  value_usd       numeric(38,12) not null, -- в базовой валюте, для агрегатов
  fx_path         jsonb,                  -- какие курсы использованы (аудит)
  primary key (asset_id, on_date)
);

create table settings (key text primary key, value jsonb not null);
  -- base_currency, timezone, и т.п.
```

### Квартира с ипотекой (valuation = invested)

Стоимость = первоначальный взнос + погашенная часть тела кредита (собственный капитал),
рыночная оценка не участвует: при продаже чужие деньги банку — не наши. Каждый платёж по
телу = `principal_payment` = шаг роста на графике. Эффект цены по построению ≈ 0 — доходности
до продажи нет, и это честно. Опционально ведётся **справочная** линия рыночной оценки
(переоценки с флагом `reference`, в итог не входит) — видно разрыв.

### Автообновление актива (recurring)

Правило `recurring_rule`: операция фиксированного типа и суммы каждого N-го числа месяца
(1–28, чтобы не зависеть от длины месяца). Джоба внутри приложения (при старте сервера
и раз в час) материализует правила в обычные операции, догоняя пропущенные месяцы
задним числом от `startDate` — так заводится история платежей по ипотеке. Созданные
операции — обычные: их можно править и удалять вручную.

### Графики

Базовый график уже на странице актива: вложенный капитал по операциям + справочная
рыночная линия (переоценки kind='reference' × количество), ступенчатые линии SVG.
Полные графики портфеля с конвертацией валют и разложением роста — в M3, после
таблицы котировок и снепшотов.

### Разложение роста

Для интервала [t1, t2]: `V2 = V1 · a · b · c`, где `a = q2/q1`, `b = p2/p1`, `c = fx2/fx1`.

- эффект номинала (довнёсения/продажи/платежи по телу) = `V1·(a−1)`
- эффект цены (переоценка, рост котировки) = `V1·a·(b−1)`
- эффект валютного курса = `V1·a·b·(c−1)`

Сумма ровно равна `ΔV` (тождество). Вырожденные интервалы (q1=0 или p1=0 — актив открыт
посреди периода, invested ещё с нулём): весь прирост относится к номиналу от момента
открытия, эффекты цены/курса считаются от первой ненулевой точки. На UI — stacked area
за период по активу и по портфелю. Обмен между своими активами связан через `transfer_id`
и ростом не считается.

## Архитектура

```
finance/
  docker-compose.yml      # postgres + app + cloudflared
  drizzle/                # миграции
  src/
    app/                  # UI: дашборд, страница актива, ввод операций, настройки
    app/api/              # тонкие route handlers → вызовы сервисов
    domain/               # ООП-ядро: не знает про БД и HTTP, покрывается юнит-тестами
      Asset.ts            #   сущность + журнал операций: quantityAt(t)
      valuation/          #   Strategy: ValuationPolicy → Market/Invested/Manual
      FxBook.ts           #   граф котировок: rateAt(unit, inUnit, date), convert()
      Money.ts            #   value object поверх decimal.js
      GrowthDecomposition.ts
    services/             # use cases: PortfolioService, SnapshotService
    db/                   # drizzle schema + репозитории (AssetRepository, OperationRepository…)
    jobs/                 # cron внутри приложения: лоадеры курсов, снепшоты
```

Политики оценки — Strategy:

```ts
abstract class ValuationPolicy {
  abstract valueAt(asset: Asset, t: Date): Money;    // стоимость в quote_currency
  abstract investedAt(asset: Asset, t: Date): Money | null;
}
class MarketValuation   extends ValuationPolicy {}  // qty × цена из FxBook/переоценок
class InvestedValuation extends ValuationPolicy {}  // Σ вложений (взнос + погашенное тело)
class ManualValuation   extends ValuationPolicy {}  // только ручные переоценки
```

Сервисы собираются инъекцией через конструктор, репозитории оборачивают drizzle,
домен тестируется юнит-тестами без БД и контейнеров.

### Безопасность и деплой

```
интернет → Cloudflare (HTTPS + Access) → cloudflared (исходящий туннель) → Next.js (своя сессия) → PG (только docker-сеть)
```

- Порты наружу не пробрасываются: cloudflared держит исходящее соединение, роутер закрыт.
- Cloudflare Access (бесплатно до 50 пользователей; нужен домен на Cloudflare): SSO или
  одноразовый код на почту — без входа запрос до приложения не доходит.
- Второй слой в приложении: один пользователь из env, эндпоинта регистрации нет вообще,
  httpOnly cookie, rate-limit на логин. Сам по себе достаточен, если домена нет.
- PG наружу не торчит; ночной `pg_dump` с шифрованием на внешнее хранилище.
- Деплой: любой хост с Docker (мини-ПК/NAS), 1–2 ГБ RAM; обновление —
  `docker compose pull && up -d`.

- **Деньги**: `numeric` в PG, `decimal.js` в TS, по API деньги отдаются строками —
  никаких float нигде.
- **Курсы**: ночной cron. НБ РК (тенге), ЦБ РФ (рубль, от него cross-курсы), крипта —
  Binance/CoinGecko daily close. Строки с `source='manual'` лоадер не трогает.
- **Снепшоты**: ночной полный пересчёт (для одного человека — дёшево) + инкрементальный
  пересчёт затронутого актива при вводе задним числом. Идемпотентный upsert по
  `(asset_id, on_date)`; фиксируют `fx_path` — история не поплывёт при переобновлении курсов.
- **Валюта отображения**: переключается в UI на лету, дефолт — в settings.

## Вехи

1. **M1 Каркас** — docker-compose (PG + Next.js), drizzle + миграции, CRUD активов и
   операций, ввод с телефона, auth. Таблицы без графиков, но уже можно вести учёт.
2. **M2 Курсы** — лоадеры (НБ РК / ЦБ РФ / крипта), граф конвертации, API стоимости
   актива и портфеля в любой валюте на дату, ручная правка курсов.
3. **M3 Снепшоты и графики** — ночной джоб; дашборд «портфель во времени» (stacked area
   по активам); страница актива: qty и стоимость; разложение роста номинал/цена/валюта.
4. **M4 Полировка** — invested-активы (ипотека) со справочной рыночной линией,
   переоценки, переключение валюты отображения, PWA-манифест.

## Дефолты, принятые без вопроса (поправимо)

- Один asset = конкретное место хранения («USDT на Bybit», «наличные USD»), не агрегат по тикеру.
- Курсы и снепшоты — дневная гранулярность; операции — с точным временем; границы суток
  — по таймзоне из settings.
- Базовая валюта по умолчанию — USD (меняется в настройках, снепшоты хранят value_usd
  для стабильности агрегатов).

## Открытые вопросы (не блокируют старт)

- Есть ли домен, привязанный к Cloudflare: если да — включаем Access, если нет — только
  собственная сессия приложения.
- Источник цен на золото: учётные цены ЦБ РФ vs НБ РК vs metal-price API — решим в M2.
- Бекфилл истории существующих активов: ручной ввод операций задним числом; CSV-импорт,
  если объём окажется большим (M4+).
