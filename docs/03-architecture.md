# Архитектура

## Общая схема

- Frontend: `client/` (`React`, `Vite`, `wouter`, UI компоненты на базе Radix/shadcn).
- Backend: `server/` (`Express`, `ws`).
- Shared contracts: `shared/` (типы схемы и API-контракты).
- DB слой: `drizzle-orm` + `pg` (в текущей версии подготовлен, но не ключевой для runtime-функций).

## Поток данных

1. Пользователь открывает `/` и вводит `username` + `roomId`.
2. Клиент переходит на `/room/:id?username=...`.
3. Хук `useWebRTC` открывает WebSocket на `/ws`.
4. Клиент отправляет `join`.
5. Сервер регистрирует клиента в in-memory `Map` и возвращает `joined`.
6. Текстовые сообщения рассылаются в комнату через `broadcastToRoom`.
7. WebRTC сигналинг пересылается точечно между участниками (`target`).
8. Медиа поток идет peer-to-peer, сервер участвует только в сигналинге.

## Основные модули

### Frontend
- `client/src/pages/login.tsx`: форма входа в комнату.
- `client/src/pages/room.tsx`: контейнер комнаты и мобильный sidebar.
- `client/src/hooks/use-webrtc.ts`: WebSocket + WebRTC логика.
- `client/src/components/chat-area.tsx`: чат и controls звонка.
- `client/src/components/active-users-list.tsx`: список пользователей.

### Backend
- `server/index.ts`: инициализация Express, middleware, запуск HTTP сервера.
- `server/routes.ts`: `GET /api/health` и WebSocket signaling (`/ws`).
- `server/static.ts`: отдача frontend в production.
- `server/vite.ts`: dev middleware через Vite.

### Shared
- `shared/schema.ts`: типы сообщений сигналинга и DB-схемы.
- `shared/routes.ts`: описания REST endpoint-ов (сейчас только health).

## Архитектурные решения

1. Сигналинг реализован поверх WebSocket, чтобы не зависеть от сторонних signaling-сервисов.
2. Голосовой канал реализован в mesh-топологии для простоты и минимальной инфраструктуры.
3. Сервер хранит активные подключения в памяти, что ускоряет прототипирование.
4. Контракты вынесены в `shared/`, чтобы синхронизировать типы client/server.

## Риски архитектуры

- in-memory состояние не переживает рестарт сервера;
- нет межинстансной синхронизации (single instance);
- при росте пользователей нужны SFU/MCU и отдельный signaling-broker;
- отсутствует централизованная authN/authZ модель.
