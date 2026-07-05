import mysql from 'mysql2/promise'
import config from './index.js'

const pool = mysql.createPool(config.db)

export default pool
