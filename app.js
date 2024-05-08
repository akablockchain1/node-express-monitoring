const express = require('express');
const promClient = require('prom-client');
const axios = require('axios'); // Импортируем axios
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL
    ? process.env.PUSHGATEWAY_URL + '/metrics/job/some_job'
    : 'http://localhost:9091/metrics/job/some_job';

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

promClient.collectDefaultMetrics();

async function pushMetricsToGateway() {
  try {
    const metrics = await promClient.register.metrics();
    const response = await axios.post(PUSHGATEWAY_URL, metrics, {
      headers: { 'Content-Type': 'text/plain' }
    });
    console.log('Metrics pushed to Pushgateway', response.status);
  } catch (err) {
    console.error('Failed to push metrics to Pushgateway', err);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    responseTimeHistogram.observe(duration / 1000); // Convert to seconds
    pushMetricsToGateway(); // Отправляем метрики после каждого запроса
  });
  next();
});

app.use((req, res, next) => {
  res.on('finish', () => {
    const statusCode = res.statusCode;
    statusCodeCounter.inc({ status_code: statusCode });
    pushMetricsToGateway(); // Отправляем метрики после каждого запроса
  });
  next();
});

app.get('/', (req, res) => {
    const requestDetails = {
        ip: req.ip,
        method: req.method,
        hostname: req.hostname,
        headers: req.headers,
        url: req.url,
        protocol: req.protocol
    };

    res.json(requestDetails);
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  promClient.register.metrics().then(metrics => {
    res.end(metrics);
  }).catch(err => {
    console.error('Error while fetching metrics:', err);
    res.status(500).send('Internal Server Error');
  });
});

app.post('/scale-up', (req, res) => {
    exec('./scale_up.sh', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Error scaling up');
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.send('Scaled up successfully');
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
