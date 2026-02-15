# API и протокол сигналинга

## HTTP API

### `GET /api/health`

Назначение: проверка доступности backend.

Ответ `200`:

```json
{
  "status": "ok"
}
```

## WebSocket

- URL: `ws://<host>/ws` или `wss://<host>/ws`.
- Транспорт: JSON-сообщения.

## События клиент -> сервер

### `join`

```json
{
  "type": "join",
  "roomId": "daily-standup",
  "username": "Alice"
}
```

### `message`

```json
{
  "type": "message",
  "roomId": "daily-standup",
  "content": "Привет!"
}
```

### `offer` / `answer`

```json
{
  "type": "offer",
  "target": "peer-user-id",
  "caller": "optional-on-client",
  "sdp": { "type": "offer", "sdp": "..." }
}
```

```json
{
  "type": "answer",
  "target": "peer-user-id",
  "caller": "optional-on-client",
  "sdp": { "type": "answer", "sdp": "..." }
}
```

### `candidate`

```json
{
  "type": "candidate",
  "target": "peer-user-id",
  "candidate": { "candidate": "...", "sdpMid": "0", "sdpMLineIndex": 0 }
}
```

## События сервер -> клиент

### `joined`

```json
{
  "type": "joined",
  "userId": "generated-id",
  "users": ["existing-user-id-1", "existing-user-id-2"]
}
```

### `user_joined`

```json
{
  "type": "user_joined",
  "userId": "new-user-id",
  "username": "Bob"
}
```

### `user_left`

```json
{
  "type": "user_left",
  "userId": "left-user-id"
}
```

### `message`

```json
{
  "type": "message",
  "roomId": "daily-standup",
  "content": "Текст сообщения",
  "senderId": "server-user-id"
}
```

### `offer` / `answer` / `candidate`

Сервер форвардит сигналинг target-пользователю в рамках той же комнаты и добавляет `caller`.

## Обработка ошибок

- При невалидном JSON или runtime-ошибке сервер пишет ошибку в лог.
- Событие `error` предусмотрено типами, но сейчас отправляется ограниченно; рекомендуется расширить централизованную обработку ошибок на сервере.
