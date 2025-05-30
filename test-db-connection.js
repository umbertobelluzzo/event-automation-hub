const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'uis_user',
  password: 'supersecretpassword',
  database: 'uis_events',
});

client.connect()
  .then(() => {
    console.log('✅ Connection successful!');
    return client.end();
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }); 