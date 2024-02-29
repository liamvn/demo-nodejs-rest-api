const request = require('supertest');
const {app} = require('../index.js'); // Assuming app is exported from your main file
const cache = require('memory-cache');
const fs = require('fs');
const jwt = require('jsonwebtoken');

let token = '';

beforeAll(async () => {
  const response = await request(app).post('/login').send({ username: 'admin', password: 'admin' });
  token = response.body.token;
});


beforeEach(() => {
  cache.clear(); // Clear cache before each test
});

// Test for root endpoint
test('GET / should return a welcome message', async () => {
  const response = await request(app).get('/').set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
  expect(response.text).toBe('Welcome to the Transactions API!');
});


// Test for CSV generation endpoint
test('POST /transactions/generate should successfully generate CSV file', async () => {
  const response = await request(app).post('/transactions/generate').set('Authorization', `Bearer ${token}`).send();
  expect(response.status).toBe(200);
  expect(response.text).toBe('CSV file generated');
}, 200000);


// Test for retrieving most purchased product endpoint
test('GET /transactions/most-purchased/:userId should return the most purchased product', async () => {
  const response = await request(app)
    .get('/transactions/most-purchased/123')
    .set('Authorization', `Bearer ${token}`)
    .query({ startDate: '2024-01-01', endDate: '2024-02-29' });
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('mostPurchasedProduct');
}, 200000);
