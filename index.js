const { Registry, Gauge, Counter } = require('prom-client');
const axios = require('axios');

// Создание реестра
const register = new Registry();

// Создание метрик
const gauge = new Gauge({
    name: 'my_custom_metric',
    help: 'Пример пользовательской метрики',
    labelNames: ['method']
});
register.registerMetric(gauge);

const counter = new Counter({
    name: 'my_custom_counter',
    help: 'Пример счётчика'
});
register.registerMetric(counter);

// Функция для отправки всех метрик в Pushgateway
async function pushMetrics() {
    // Установка значения метрики
    gauge.labels('example').set(Math.random() * 100);
    counter.inc();  // Инкремент счётчика

    // Получение всех метрик в формате Prometheus
    const metrics = await register.metrics();

    // Отправка данных в Pushgateway
    const pushgatewayUrl = 'http://localhost:9091/metrics/job/my_job';
    try {
        const response = await axios.post(pushgatewayUrl, metrics, {
            headers: { 'Content-Type': 'text/plain' }
        });
        console.log('Все метрики успешно отправлены в Pushgateway');
    } catch (error) {
        console.error('Не удалось отправить метрики:', error);
    }
}

// Запуск функции отправки метрик
pushMetrics();
