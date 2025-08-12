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

            // 获取sort参数，格式为field:direction (例如: name:asc 或 age:desc)
            const sortParam = req.query.sort || '';
            let sortOptions = {};

            // 解析并验证sort参数
            if (sortParam) {
                const [field, direction] = sortParam.split(':');
                if (field) {
                    sortOptions[field] = direction !== 'desc' ? 1 : -1;
                }
            }


            // 获取查询参数，默认为空对象
            let query = {};
            const queryParam = req.query.query;
            console.log("queryParam:", queryParam);
            if (queryParam) {
                try {
                    // 尝试解析查询参数为JSON对象
                    query = JSON.parse(queryParam);
                    // 确保查询是一个对象
                    if (typeof query !== 'object' || query === null) {
                        query = {};
                    }
                } catch (err) {
                    // 解析失败，使用空对象
                    console.error('Failed to parse query parameter:', err);
                    query = {};
                }
            }

            console.log("query:", query);
            const collection = db.collection(req.params.tablename);
            try {
                const items = await collection.find(query)
                    .sort(sortOptions)
                    .skip(validSkip)
                    .limit(validLimit)
                    .toArray();
                res.json(items);
            } catch (err) {
                // 处理Azure Cosmos DB索引错误
                if (err.message && err.message.includes('The index path corresponding to the specified order-by item is excluded')) {
                    res.status(400).json({
                        message: 'Cannot sort by the specified field. The field may not have an index in the database.',
                        error: 'Missing index for sort field',
                        sortField: Object.keys(sortOptions)[0] || 'unknown',
                        suggestion: '请创建索引后再排序查询. /v1/createindex/:tablename/:field'
                    });
                } else {
                    res.status(500).json({
                        message: 'Error fetching items',
                        error: err.message
                    });
                }
            }
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

    app.get('/v1/createindex/:tablename/:field', async (req, res) => {
        try {
            const { tablename, field } = req.params;
            const collection = db.collection(tablename);
            
            // 创建索引 (1表示升序，-1表示降序)
            const indexResult = await collection.createIndex({ [field]: 1 });
            
            res.json({
                message: 'Index created successfully',
                indexName: indexResult,
                field: field,
                collection: tablename
            });
        } catch (err) {
            res.status(500).json({
                message: 'Error creating index',
                error: err.message,
                field: field,
                collection: tablename
            });
        }
    });
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
});