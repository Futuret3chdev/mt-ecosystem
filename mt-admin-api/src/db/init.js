const db = require('../db');

console.log('Initializing MT Admin database...');
db.initDB();
console.log('Done. Database ready at', process.env.DB_PATH || './mt-admin.db');
console.log('You can now start the server with: npm start');