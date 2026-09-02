// Redis client setup. Creates and connects a Redis client to localhost:6379
// and exports it as the default for session storage, caching, and OTP storage.
import { createClient } from 'redis';

const client = createClient({
    url: 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Client Error', err));

await client.connect();
console.log("Connected to Redis!");

export default client;