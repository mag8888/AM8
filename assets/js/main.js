/**
 * Главный файл инициализации игры
 */
import BoardLayout from './modules/game/BoardLayout.js';

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Инициализация игры Aura Money');

    // Создание экземпляров
    const eventBus = new window.EventBus();
    const gameState = new window.GameState(eventBus);

    // Создание BoardLayout
    const boardLayout = new BoardLayout({
        outerTrackSelector: '#outer-track',
        innerTrackSelector: '#inner-track',
        gameState: gameState,
        eventBus: eventBus
    });

    // Обработчики UI событий
    setupUIHandlers(gameState, boardLayout, eventBus);

    // Подписка на игровые события
    setupGameEventListeners(gameState, eventBus);

    console.log('✅ Игра готова к запуску');
});

/**
 * Настройка обработчиков UI
 */
function setupUIHandlers(gameState, boardLayout, eventBus) {
    const startButton = document.getElementById('start-game');
    const rollButton = document.getElementById('roll-dice');
    const diceElement = document.getElementById('dice-result');

    // Кнопка начала игры
    startButton.addEventListener('click', () => {
        gameState.startGame([
            { name: 'Игрок 1', position: 0, isInner: false, money: 1000 }
        ]);
        
        boardLayout.renderTracks();
        
        startButton.disabled = true;
        rollButton.disabled = false;
        
        addLogEntry('Игра начата! Бросайте кубик.', 'success');
    });

    // Кнопка броска кубика
    rollButton.addEventListener('click', () => {
        const roll = gameState.rollDice();
        
        // Анимация кубика
        diceElement.classList.add('rolling');
        diceElement.textContent = '🎲';
        
        setTimeout(() => {
            diceElement.classList.remove('rolling');
            diceElement.textContent = roll;
            
            gameState.moveCurrentPlayer(roll);
            
            addLogEntry(`Выпало ${roll}!`, 'success');
        }, 500);
    });
}

/**
 * Настройка слушателей игровых событий
 */
function setupGameEventListeners(gameState, eventBus) {
    // Клик по клетке
    eventBus.on('cell:clicked', (data) => {
        const cellInfo = document.getElementById('cell-info');
        cellInfo.innerHTML = window.getCellDescription(data.cellData);
        
        addLogEntry(`Клетка: ${data.cellData.name}`, 'info');
    });

    // Перемещение игрока
    eventBus.on('player:moved', (data) => {
        const player = data.player;
        const positionDisplay = document.getElementById('position-display');
        positionDisplay.textContent = `${player.position + 1} ${player.isInner ? '(внутренний)' : '(внешний)'}`;
        
        const cellData = player.isInner ? 
            window.SMALL_CIRCLE_CELLS[player.position] : 
            window.BIG_CIRCLE_CELLS[player.position];
        
        if (cellData) {
            addLogEntry(`${player.name} на клетке: ${cellData.name}`, 'success');
            
            // Обработка событий клетки
            handleCellEvent(player, cellData, gameState);
        }
    });

    // Изменение денег
    eventBus.on('player:money-changed', (data) => {
        const change = data.change > 0 ? `+${data.change}` : data.change;
        addLogEntry(`Баланс: ${data.newMoney} (${change})`, data.change > 0 ? 'success' : 'danger');
    });
}

/**
 * Обработка событий клетки
 */
function handleCellEvent(player, cellData, gameState) {
    switch (cellData.type) {
        // ВНЕШНИЙ КРУГ
        case 'money':
            // Доход от инвестиций - рассчитывается от всех активов
            const totalIncome = player.totalIncome || 0;
            if (totalIncome > 0) {
                gameState.updatePlayerMoney(totalIncome);
                addLogEntry(`💰 Доход от инвестиций: $${totalIncome}`, 'success');
            } else {
                addLogEntry(`💰 Доход от инвестиций: $0 (нет активов)`, 'info');
            }
            break;
            
        case 'business':
            // Возможность купить бизнес
            addLogEntry(`🏢 Бизнес: ${cellData.name} ($${cellData.cost})`, 'warning');
            if (cellData.specialCondition) {
                addLogEntry(`⭐ Спец. условие: ${cellData.specialCondition}`, 'info');
            }
            break;
            
        case 'dream':
            // Мечта - победное условие
            addLogEntry(`🌟 Мечта: ${cellData.name} ($${cellData.cost})`, 'warning');
            break;
            
        case 'loss':
            // Потеря денег или активов
            if (cellData.lossPercent) {
                const currentCash = player.money || 0;
                const lossAmount = Math.floor(currentCash * (cellData.lossPercent / 100));
                gameState.updatePlayerMoney(-lossAmount);
                addLogEntry(`💸 ${cellData.name}: Потеря ${cellData.lossPercent}% ($${lossAmount})`, 'danger');
            } else if (cellData.lossType) {
                addLogEntry(`💸 ${cellData.name}: ${cellData.description}`, 'danger');
            }
            break;
            
        case 'charity':
            // Благотворительность внешнего круга
            addLogEntry(`❤️ Благотворительность: Сделайте пожертвование`, 'warning');
            break;
        
        // ВНУТРЕННИЙ КРУГ
        case 'green_opportunity':
            // Зеленая возможность - выбор сделки
            addLogEntry(`💚 Зеленая возможность: Выберите малую или большую сделку`, 'success');
            break;
            
        case 'yellow_payday':
            // PayDay - получение зарплаты
            const salary = player.salary || 5000;
            gameState.updatePlayerMoney(salary);
            addLogEntry(`💰 PayDay: Получена зарплата $${salary}`, 'success');
            break;
            
        case 'pink_expense':
            // Всякая всячина - обязательная трата
            const expense = Math.floor(Math.random() * (cellData.maxCost - cellData.minCost + 1)) + cellData.minCost;
            gameState.updatePlayerMoney(-expense);
            addLogEntry(`🛒 Всякая всячина: Трата $${expense}`, 'danger');
            break;
            
        case 'blue_market':
            // Рынок - возможность продажи
            addLogEntry(`🏪 Рынок: Возможность продать активы`, 'info');
            break;
            
        case 'orange_charity':
            // Благотворительность внутреннего круга
            addLogEntry(`❤️ Благотворительность: Пожертвуйте ${cellData.donationPercent}% дохода`, 'warning');
            addLogEntry(`🎁 Награда: ${cellData.bonusTurns} специальных хода`, 'success');
            break;
            
        case 'purple_baby':
            // Ребенок - увеличение расходов
            addLogEntry(`👶 Ребенок: Поздравляем! Расходы +$${cellData.monthlyExpenseIncrease}/мес`, 'warning');
            // TODO: Обновить ежемесячные расходы игрока
            break;
            
        case 'black_loss':
            // Увольнение - риск банкротства
            addLogEntry(`💸 Увольнение: Выберите вариант оплаты`, 'danger');
            if (cellData.bankruptcy) {
                addLogEntry(`⚠️ Риск банкротства!`, 'danger');
            }
            break;
    }
}

/**
 * Добавить запись в лог событий
 */
function addLogEntry(text, type = 'info') {
    const log = document.getElementById('event-log');
    const entry = document.createElement('p');
    entry.className = `log-entry ${type}`;
    entry.textContent = text;
    
    log.insertBefore(entry, log.firstChild);
    
    // Ограничение количества записей
    while (log.children.length > 20) {
        log.removeChild(log.lastChild);
    }
}
