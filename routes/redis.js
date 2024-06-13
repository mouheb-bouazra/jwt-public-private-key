var express = require('express');
var router = express.Router();
const { createClient } = require('redis');

const client = createClient({
    socket: {
        host: '127.0.0.1',
        port: 6379,
    }
});

client.on('error', error => console.error('Redis Client Error:', error));
client.on('connect', () => console.log('Redis Client Connected!'));

router.post('/', async function (req, res, next) {
    try {
        await client.connect();

        const { orgId, value } = req.body;

        if (!orgId || !value) {
            return res.status(400).send({ error: 'orgId and value are required' });
        }

        const key = `${orgId}:${value}`;

        // Check if the key already exists in Redis
        const existingValue = await client.get(key);

        if (existingValue) {
            // Refresh the TTL if the key exists
            await client.expire(key, 60);
            console.log('Key exists. TTL refreshed to 60 seconds:', key);
            return res.send({ message: `Key exists. TTL refreshed to 60 seconds: ${key}` });
        } else {
            // Set the key with a TTL of 60 seconds
            await client.set(key, value, {
                EX: 60 // Time to live in seconds
            });

            console.log('Key stored in Redis with TTL of 60 seconds:', key);
            return res.send({ message: `Key stored in Redis with TTL of 60 seconds: ${key}` });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).send({ error: error.message });
    } finally {
        await client.disconnect();
    }
});

router.get('/:orgId', async function (req, res, next) {
    try {
        await client.connect();

        const { orgId } = req.params;

        if (!orgId) {
            return res.status(400).send({ error: 'orgId is required' });
        }

        // Fetch all keys with the prefix `orgId`
        const keys = await client.keys(`${orgId}*`);

        // Retrieve values for all keys
        const values = [];
        for (const key of keys) {
            const value = await client.get(key);
            values.push({ key, value });
        }

        console.log('All values for orgId from Redis:', values);

        return res.status(200).send(values);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).send({ error: error.message });
    } finally {
        await client.disconnect();
    }
});

module.exports = router;
