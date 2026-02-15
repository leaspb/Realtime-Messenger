# Сборка и деплой

## Production-сборка

```bash
npm run build
```

Сборка выполняет:
1. `vite build` для frontend (`dist/public`);
2. `esbuild` для backend в единый файл `dist/index.cjs`.

## Production-запуск

```bash
npm run start
```

Эквивалентно:

```bash
NODE_ENV=production node dist/index.cjs
```

## Обязательные переменные

- `DATABASE_URL` - обязательно
- `PORT` - порт HTTP сервера (по умолчанию `5000`)
- `NODE_ENV=production`

## Health check

После запуска:

```bash
curl http://<host>:<port>/api/health
```

Ожидается: `{"status":"ok"}`.

## Рекомендации по окружению

1. Использовать HTTPS для корректного WebRTC в браузерах (особенно вне localhost).
2. Проксировать `WebSocket /ws` без таймаутов, обрывающих долгие соединения.
3. Настроить restart policy процесса (systemd, Docker restart, platform supervisor).
4. Включить сбор структурированных логов и мониторинг health endpoint.

## Примечание для Replit

В `.replit` уже описаны:
- build: `npm run build`
- run: `node ./dist/index.cjs`
- публичный порт: `5000`.
