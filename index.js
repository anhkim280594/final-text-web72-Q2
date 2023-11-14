const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3008;

function authenticateToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });

        req.user = user;
        next();
    });
}

mongoose.connect('mongodb://localhost:3008/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const orders = new mongoose.Schema({
    item: String,
    price: Number,
    quantity: Number,
});

const inventory = new mongoose.Schema({
    sku: String,
    description: String,
    instock: Number,
});

const users = new mongoose.Schema({
    username: String,
    password: String,
});


const Order = mongoose.model('Order', orders);
const Inventory = mongoose.model('Inventory', inventory);
const User = mongoose.model('User', users);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/data', async (req, res) => {
    const inputData = req.body;
    console.log('Received data:', inputData);

    try {
        const orderResult = await Order.create(inputData.order);
        const inventoryResult = await Inventory.create(inputData.inventory);
        const userResult = await User.create(inputData.user);

        console.log('Order:', orderResult);
        console.log('Inventory:', inventoryResult);
        console.log('User:', userResult);

        res.json({ message: 'Data received and added to MongoDB successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.get('/api/inventory', async (req, res) => {
    try {
        const allInventory = await Inventory.find();
        res.json(allInventory);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const lowStockInventory = await Inventory.find({ instock: { $lt: 100 } });

        res.json(lowStockInventory);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, 'your-secret-key', {
        });

        res.json({ token });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/protected-resource', authenticateToken, (req, res) => {
    res.json({ message: 'You have access to the protected resource!', user: req.user });
});

app.post('/api/orders', authenticateToken, async (req, res) => {
    const { items } = req.body;
    try {
        const order = await Order.create({ items });
        res.json(order);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});