const express = require('express');
const faker = require('faker');
const csv = require('fast-csv');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cache = require('memory-cache');
const { Transform } = require('stream');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const NUMBERS_RECORDS = 1e6;
const SECRET_KEY = '6BW01t2H9N12DDc8BSn3M5zZ';

// Generate CSV records asynchronously
const generateCSV = () => {
    return new Promise((resolve, reject) => {
        const users = Array(10000).fill(null).map((_, index) => index + 1);
        const products = Array(100).fill(null).map(() => faker.commerce.productName());
        const ws = fs.createWriteStream('transactions.csv');
        ws.write('TransactionId,UserId,Date,Product,Quantity,Price\n');

        for (let i = 0; i < NUMBERS_RECORDS; i++) {
            const TransactionId = faker.datatype.uuid();
            const UserId = users[Math.floor(Math.random() * users.length)];
            const Date = faker.date.between('2019-02-26', '2024-02-26');
            const Product = products[Math.floor(Math.random() * products.length)];
            const Quantity = Math.floor(Math.random() * 10) + 1;
            const Price = faker.commerce.price(10, 1000, 2);
            ws.write(`${TransactionId},${UserId},${Date},${Product},${Quantity},${Price}\n`);
        }

        ws.end(() => {
            console.log('CSV file generated successfully!');
            resolve();
        });
        ws.on('error', reject);
    });
};

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

app.get('/', authenticateJWT, (req, res) => {
    res.send('Welcome to the Transactions API!');
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username !== 'admin' || password !== 'admin') {
        return res.status(401).send('Invalid username or password');
    }
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});
app.post('/transactions/generate', authenticateJWT, async (req, res) => {
    try {
        await generateCSV();
        res.send('CSV file generated');
    } catch (err) {
        console.error('Error generating CSV file:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Middleware for caching by duration in seconds
const cacheMiddleware = (duration) => {
    return (req, res, next) => {
      let key = '__express__' + req.originalUrl || req.url;
      let cachedBody = cache.get(key);
      if (cachedBody) {
        res.send(cachedBody);
        return;
      } else {
        res.sendResponse = res.send;
        res.send = (body) => {
          cache.put(key, body, duration * 1000);
          res.sendResponse(body);
        };
        next();
      }
    };
  };

app.get('/transactions/most-purchased/:userId', authenticateJWT, cacheMiddleware(30), (req, res) => {
    const userId = String(req.params.userId);
    const { startDate, endDate } = req.query;

    if (!userId || !startDate || !endDate) {
        return res.status(400).send('Invalid request');
    }

    const productsCount = new Map();

    if (!fs.existsSync('transactions.csv')) {
        return res.status(404).send('CSV file not found');
    }

    fs.createReadStream('transactions.csv')
        .pipe(csv.parse({ headers: true }))
        .pipe(new Transform({
            objectMode: true,
            transform(row, encoding, callback) {
                if (row.UserId === userId && new Date(row.Date) >= new Date(startDate) && new Date(row.Date) <= new Date(endDate)) {
                    callback(null, row);
                } else {
                    callback();
                }
            }
        }))
        .on('data', (row) => {
            const product = row.Product;
            const count = productsCount.get(product) || 0;
            productsCount.set(product, count + 1);
        })
        .on('end', () => {
            let mostPurchasedProduct = null;
            let maxCount = 0;

            if (productsCount.size === 0) {
                return res.send({ "message": "No transactions found for the given user and date range."});
            }

            for (const [product, count] of productsCount) {
                if (count > maxCount) {
                    mostPurchasedProduct = product;
                    maxCount = count;
                }
            }

            res.send({ mostPurchasedProduct });
        });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = {
    app
};