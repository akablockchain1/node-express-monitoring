const express = require('express');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем метрики для Prometheus
const responseTimeHistogram = new promClient.Histogram({
  name: 'response_time_seconds',
  help: 'Response time in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Bucket boundaries in seconds
});

const statusCodeCounter = new promClient.Counter({
  name: 'http_status_code_total',
  help: 'Total number of HTTP status codes',
  labelNames: ['status_code'],
});

// Регистрируем метрики для Prometheus
promClient.collectDefaultMetrics();

// Middleware для сбора времени ответа
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    responseTimeHistogram.observe(duration / 1000); // Convert to seconds
  });
  next();
});

// Middleware для сбора статусов ответов
app.use((req, res, next) => {
  res.on('finish', () => {
    const statusCode = res.statusCode;
    statusCodeCounter.inc({ status_code: statusCode });
  });
  next();
});

// Эндпоинт для метрик Prometheus
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  promClient.register.metrics().then(metrics => {
    res.end(metrics);
  }).catch(err => {
    console.error('Error while fetching metrics:', err);
    res.status(500).send('Internal Server Error');
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
