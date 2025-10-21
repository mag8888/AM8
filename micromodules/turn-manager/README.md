# 🎯 AM8 Turn Manager

Микромодуль, отвечающий за пошаговое управление ходами в Aura Money:

- отслеживает активного игрока и синхронизирует состояние с `GameStateManager`;
- инициирует передачу хода и бросок кубика с генерацией числа на сервере;
- управляет перемещением фишек с задержкой 0.5 секунды на клетку;
- оповещает UI через `EventBus` и собственные события.

## Быстрый старт

```javascript
const turnManager = new TurnManager({
    turnService,
    movementService,
    gameStateManager,
    eventBus,
    stepDelayMs: 500
});

await turnManager.rollDice();
await turnManager.endTurn();
```

## События

- `turn:state` — обновление состояния (активный игрок, разрешённые действия);
- `turn:diceRolled` — бросок кубика выполнен, содержит выпавшее значение;
- `turn:movementStarted` / `turn:movementCompleted` — начало и завершение анимации движения.

## Лицензия

MIT
