const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

app.use(cors());
app.use(bodyParser.json());

// MongoDB 连接
const uri = process.env.AZURE_COSMOS_CONNECTIONSTRING;
const client = new MongoClient(uri);
const dbName = process.env.DBNAME || 'test';

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
    app.post('/v1/rest/:tablename', async (req, res) => {
        try {
            const newItem = req.body;
            const collection = db.collection(req.params.tablename);
            const result = await collection.insertOne(newItem);
            newItem._id = result.insertedId;
            res.status(201).json(newItem);
        } catch (err) {
            res.status(500).json({ message: 'Error creating item', error: err.message });
        }
    });

    // 读取所有 (GET)
    app.get('/v1/rest/:tablename', async (req, res) => {
        try {
            // 获取limit参数，默认为100
            const limit = parseInt(req.query.limit) || 100;
            // 确保limit是有效的数字且大于0
            let validLimit = isNaN(limit) || limit <= 0 ? 100 : limit;
            if (validLimit > 2000) validLimit = 2000;

            // 获取skip参数，默认为0
            const skip = parseInt(req.query.skip) || 0;
            // 确保skip是有效的数字且大于等于0
            const validSkip = isNaN(skip) || skip < 0 ? 0 : skip;

            const collection = db.collection(req.params.tablename);
            const items = await collection.find({}).skip(validSkip).limit(validLimit).toArray();
            res.json(items);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching items', error: err.message });
        }
    });

    // 读取单个 (GET)
    app.get('/v1/rest/:tablename/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const collection = db.collection(req.params.tablename);
            // ObjectId(id)
            console.log("get item:", new ObjectId(id));
            const item = await collection.findOne({ _id: new ObjectId(id) });
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
    app.put('/v1/rest/:tablename/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const collection = db.collection(req.params.tablename);
            const result = await collection.findOneAndUpdate(
                { _id: new ObjectId(id) },
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
    app.delete('/v1/rest/:tablename/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const collection = db.collection(req.params.tablename);
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
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