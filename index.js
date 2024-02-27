import express from 'express';
import faker from 'faker';
import csv from 'fast-csv';
import fs from 'fs';
import { Transform } from 'stream';

const app = express();
const PORT = process.env.PORT || 3000;
const NUMBERS_RECORDS = 1000000;

// Generate CSV records asynchronously
const generateCSV = () => {
    return new Promise((resolve, reject) => {
        const users = Array(10000).fill(null).map(() => faker.datatype.uuid());
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

app.post('/transactions/generate', async (req, res) => {
    try {
        await generateCSV();
        res.send('CSV file generated');
    } catch (err) {
        console.error('Error generating CSV file:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/transactions/most-purchased/:userId', (req, res) => {
    const userId = String(req.params.userId);
    const { startDate, endDate } = req.query;

    if (!userId || !startDate || !endDate) {
        return res.status(400).send('Invalid request');
    }

    const productsCount = new Map();

    fs.createReadStream('transactions.csv')
        .pipe(csv.parse({ headers: true }))
        .pipe(new Transform({
            objectMode: true,
            transform(row, encoding, callback) {
                if (row.UserId === userId && row.Date >= startDate && row.Date <= endDate) {
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
