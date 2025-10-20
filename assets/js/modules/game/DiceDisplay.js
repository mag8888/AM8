/**
 * DiceDisplay v1.0.0
 * Компонент для отображения результата броска кубика
 */
class DiceDisplay {
    constructor(config = {}) {
        this.containerSelector = config.containerSelector || '#dice-display';
        this.eventBus = config.eventBus || null;
        this.diceService = config.diceService || null;
        
        this.container = null;
        this.currentDisplay = null;
        
        console.log('🎲 DiceDisplay: Инициализация...');
        this.init();
    }
    
    /**
     * Инициализация компонента
     */
    init() {
        this.setupContainer();
        this.addStyles();
        this.setupEventListeners();
        
        console.log('✅ DiceDisplay: Инициализирован');
    }
    
    /**
     * Настройка контейнера
     */
    setupContainer() {
        this.container = document.querySelector(this.containerSelector);
        
        if (!this.container) {
            // Создаем контейнер если его нет, но не добавляем в DOM
            this.container = document.createElement('div');
            this.container.id = 'dice-display';
            this.container.className = 'dice-display-container';
            // Контейнер кубиков удален - не добавляем в DOM
        }
    }
    
    /**
     * Добавление стилей
     */
    addStyles() {
        if (document.getElementById('dice-display-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'dice-display-styles';
        styles.textContent = `
            .dice-display-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                pointer-events: none;
                display: none !important; /* Кубики скрыты */
            }
            
            .dice-result {
                background: linear-gradient(135deg, #1e293b, #334155);
                border: 2px solid #fbbf24;
                border-radius: 12px;
                padding: 16px 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                color: white;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                text-align: center;
                min-width: 120px;
                transform: translateY(-100px);
                opacity: 0;
                transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            .dice-result.show {
                transform: translateY(0);
                opacity: 1;
            }
            
            .dice-result.hide {
                transform: translateY(-100px);
                opacity: 0;
            }
            
            .dice-title {
                font-size: 0.9rem;
                color: #fbbf24;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .dice-values {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .dice-value {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                font-weight: bold;
                color: #1e293b;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                animation: diceRoll 0.6s ease-in-out;
            }
            
            .dice-total {
                font-size: 1.4rem;
                color: #fbbf24;
                font-weight: bold;
                margin-top: 4px;
            }
            
            .dice-special {
                font-size: 0.8rem;
                color: #10b981;
                margin-top: 4px;
                font-weight: bold;
            }
            
            .dice-penalty {
                font-size: 0.8rem;
                color: #ef4444;
                margin-top: 4px;
                font-weight: bold;
            }
            
            @keyframes diceRoll {
                0% {
                    transform: rotate(0deg) scale(1);
                }
                25% {
                    transform: rotate(90deg) scale(1.1);
                }
                50% {
                    transform: rotate(180deg) scale(0.9);
                }
                75% {
                    transform: rotate(270deg) scale(1.1);
                }
                100% {
                    transform: rotate(360deg) scale(1);
                }
            }
            
            @keyframes diceAppear {
                0% {
                    transform: scale(0) rotate(180deg);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                }
            }
            
            .dice-result.appearing {
                animation: diceAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('dice:rolled', (rollResult) => {
                this.displayRoll(rollResult);
            });
            
            this.eventBus.on('dice:double', (rollResult) => {
                this.highlightDouble(rollResult);
            });
            
            this.eventBus.on('dice:max_doubles', (rollResult) => {
                this.showPenalty(rollResult);
            });
            
            this.eventBus.on('game:reset', () => {
                this.hideDisplay();
            });
        }
    }
    
    /**
     * Отображение результата броска
     */
    displayRoll(rollResult) {
        if (!rollResult) return;
        
        // Кубики удалены - не отображаем их
        console.log('🎲 DiceDisplay: Кубики удалены, результат не отображается:', rollResult);
        return;
    }
    
    /**
     * Подсветка дубля
     */
    highlightDouble(rollResult) {
        if (!this.currentDisplay) return;
        
        const specialElement = this.currentDisplay.querySelector('.dice-special');
        if (specialElement) {
            specialElement.style.animation = 'diceRoll 0.5s ease-in-out infinite';
            specialElement.style.color = '#fbbf24';
        }
    }
    
    /**
     * Показ штрафа
     */
    showPenalty(rollResult) {
        if (!this.currentDisplay) return;
        
        const penaltyElement = this.currentDisplay.querySelector('.dice-penalty');
        if (penaltyElement) {
            penaltyElement.style.animation = 'diceRoll 0.3s ease-in-out infinite';
            penaltyElement.style.color = '#ef4444';
        }
    }
    
    /**
     * Скрытие отображения
     */
    hideDisplay() {
        if (this.currentDisplay) {
            this.currentDisplay.classList.add('hide');
            setTimeout(() => {
                if (this.currentDisplay && this.currentDisplay.parentNode) {
                    this.currentDisplay.parentNode.removeChild(this.currentDisplay);
                }
                this.currentDisplay = null;
            }, 500);
        }
    }
    
    /**
     * Принудительное отображение результата
     */
    forceDisplay(rollResult) {
        this.displayRoll(rollResult);
    }
    
    /**
     * Обновление позиции контейнера
     */
    updatePosition(x, y) {
        if (this.container) {
            this.container.style.left = `${x}px`;
            this.container.style.top = `${y}px`;
        }
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.DiceDisplay = DiceDisplay;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiceDisplay;
}
