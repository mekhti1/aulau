# AULAU — Интеллектуальная система мониторинга рыбных ресурсов Каспия

## Установка и запуск

### 1. Установка зависимостей

```bash
cd Aulau
npm install
```

### 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. В настройках проекта → Database → Connection String, скопируйте:
   - **URI** (для `DATABASE_URL`)
   - **Direct Connection** (для `DIRECT_URL`)
3. В настройках проекта → API, скопируйте:
   - **URL** (для `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public key** (для `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-xx-x.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxxx:password@aws-0-xx-x.pooler.supabase.com:5432/postgres

QR_HMAC_SECRET=aulau-caspian-secret-2024
JWT_SECRET=aulau-jwt-secret-hackathon-2024
```

### 4. Инициализация базы данных

```bash
# Создать таблицы
npx prisma db push

# Заполнить демо-данными
npm run seed
```

### 5. Запуск

```bash
npm run dev
```

Открыть: [http://localhost:3000](http://localhost:3000)

---

## Демо-аккаунты

| Роль | Логин | Пароль |
|------|-------|--------|
| 🐟 Рыбак | fisher1 | 123456 |
| 🛡️ Инспектор | inspector1 | 123456 |
| 🛒 Покупатель | buyer1 | 123456 |
| ⚙️ Администратор | admin1 | 123456 |

---

## Сценарий демонстрации (90 секунд)

### 1. Вход инспектора (10 сек)
- Откройте `/login`
- Нажмите «Инспектор» в демо-аккаунтах
- Откроется дашборд с картой Каспия

### 2. AI Обнаружение (15 сек)
- Перейдите на вкладку «Обнаружение»
- Выберите гидрофон «Урало-Каспийский канал»
- Выберите «Скоростной катер (демо)»
- Нажмите «Запустить обнаружение»
- Появится результат: «Скоростной катер», угроза HIGH

### 3. Инцидент на карте (10 сек)
- Перейдите на вкладку «Инциденты»
- Новый инцидент появился в списке
- Красная точка появилась на карте

### 4. Вход рыбака (15 сек)
- Выйдите из системы
- Войдите как fisher1
- Покажите квоту (500 кг, использовано 127.5 кг)

### 5. Регистрация улова (15 сек)
- Нажмите «Зарегистрировать улов»
- Выберите «Судак», введите вес «25 кг»
- Нажмите «Подписать ЭЦП»
- Подпишите документ
- QR-код сгенерирован

### 6. Маркетплейс (10 сек)
- Перейдите в «Партии»
- Покажите проверенную партию
- Нажмите «Разместить на маркетплейсе»

### 7. Покупка (10 сек)
- Войдите как buyer1
- Выберите партию в маркетплейсе
- Нажмите «Купить»

### 8. Трассировка (10 сек)
- Нажмите «Паспорт» у любой партии
- Покажите цифровой паспорт с историей

### 9. Поддельный QR (5 сек)
- На вкладке QR Сканер инспектора
- Введите: `BATCH:BATCH-FORGED:abcdef1234567890`
- Покажите: «Недействительный QR-код»

---

## Технологии

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL + Prisma 5
- **Карты:** Leaflet + OpenStreetMap
- **Графики:** Recharts
- **QR:** qrcode + html5-qrcode + HMAC SHA-256
- **Аутентификация:** JWT + bcrypt

---

## Структура проекта

```
Aulau/
├── prisma/
│   ├── schema.prisma       # Схема базы данных
│   └── seed.js             # Демо-данные
├── src/
│   ├── app/
│   │   ├── api/            # API маршруты
│   │   ├── admin/          # Панель администратора
│   │   ├── fisher/         # Приложение рыбака
│   │   ├── inspector/      # Дашборд инспектора
│   │   ├── marketplace/    # Маркетплейс покупателя
│   │   ├── trace/          # Публичные страницы трассировки
│   │   ├── login/          # Страница входа
│   │   └── layout.tsx      # Корневой макет
│   ├── components/         # Общие компоненты
│   ├── hooks/              # React хуки
│   └── lib/                # Утилиты и конфигурация
├── tailwind.config.ts
├── .env.example
└── README.md
```
