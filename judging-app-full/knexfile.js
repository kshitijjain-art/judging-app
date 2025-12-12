module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_PATH || './judging.db'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 }
  }
};
