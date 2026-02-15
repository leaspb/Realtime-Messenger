# Документация Realtime Messenger

Этот каталог содержит полный комплект проектной документации по приложению `Realtime-Messenger`.

## Содержание

1. [Цель и границы проекта](./01-project-goal.md)
2. [Требования](./02-requirements.md)
3. [Архитектура](./03-architecture.md)
4. [API и протокол сигналинга](./04-api-and-signaling.md)
5. [Локальная разработка](./05-local-development.md)
6. [Сборка и деплой](./06-deployment.md)
7. [Эксплуатация (runbook)](./07-operations-runbook.md)
8. [Тестирование и качество](./08-testing-and-quality.md)
9. [План задач и roadmap](./09-roadmap.md)
10. [Исходное задание](./task.txt)
11. [Исходные заметки требований](./requirements-notes.md)

## Кратко о проекте

`Realtime-Messenger` - это веб-приложение для комнатного чата с:
- обменом текстовыми сообщениями в реальном времени;
- голосовой связью через WebRTC (mesh-топология);
- сигналингом через WebSocket сервер (`/ws`).

Текущий стек: `React + Vite` (frontend), `Express + ws` (backend), `TypeScript` во всех слоях.
