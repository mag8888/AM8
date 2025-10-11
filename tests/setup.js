/**
 * Настройка тестового окружения Jest
 */

// Устанавливаем переменные окружения для тестов
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/aura-money-test';

// Увеличиваем таймаут для асинхронных операций
jest.setTimeout(10000);

// Глобальные моки
global.console = {
    ...console,
    // Отключаем console.log в тестах для чистоты вывода
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
