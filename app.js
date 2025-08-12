const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');

app.use(cors());
app.use(bodyParser.json());

// MongoDB 连接
const uri = process.env.AZURE_COSMOS_CONNECTIONSTRING;
const client = new MongoClient(uri);
const dbName = 'restDB';

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
        return client.db(dbName);
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        throw err;
    }
}

let db;
connectToDatabase().then(database => {
    db = database;

    // 修改各接口使用 MongoDB 操作
    // 创建 (POST)
    app.post('/items', async (req, res) => {
        try {
            const newItem = req.body;
            const collection = db.collection('items');
            const result = await collection.insertOne(newItem);
            newItem._id = result.insertedId;
            res.status(201).json(newItem);
        } catch (err) {
            res.status(500).json({ message: 'Error creating item', error: err.message });
        }
    });

    // 读取所有 (GET)
    app.get('/items', async (req, res) => {
        try {
            const collection = db.collection('items');
            const items = await collection.find({}).toArray();
            res.json(items);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching items', error: err.message });
        }
    });

    // 读取单个 (GET)
    app.get('/items/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const collection = db.collection('items');
            const item = await collection.findOne({ _id: new require('mongodb').ObjectId(id) });
            if (item) {
                res.json(item);
            } else {
                res.status(404).json({ message: 'Item not found' });
            }
        } catch (err) {
            res.status(500).json({ message: 'Error fetching item', error: err.message });
        }
    });

    // 更新 (PUT)
    app.put('/items/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const collection = db.collection('items');
            const result = await collection.findOneAndUpdate(
                { _id: new require('mongodb').ObjectId(id) },
                { $set: updateData },
                { returnOriginal: false }
            );
            if (result.value) {
                res.json(result.value);
            } else {
                res.status(404).json({ message: 'Item not found' });
            }
        } catch (err) {
            res.status(500).json({ message: 'Error updating item', error: err.message });
        }
    });

    // 删除 (DELETE)
    app.delete('/items/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const collection = db.collection('items');
            const result = await collection.deleteOne({ _id: new require('mongodb').ObjectId(id) });
            if (result.deletedCount > 0) {
                res.status(204).send();
            } else {
                res.status(404).json({ message: 'Item not found' });
            }
        } catch (err) {
            res.status(500).json({ message: 'Error deleting item', error: err.message });
        }
    });
    
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
});