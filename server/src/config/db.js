/**
 * ====================================================
 * 数据库连接池模块
 * ====================================================
 * 基于 mysql2/promise 创建连接池，自动管理连接的
 * 创建、复用和销毁。应用启动时创建，关闭时释放。
 *
 * 所有数据模型类通过此文件获取连接池实例，
 * 不应直接创建新连接。
 * ====================================================
 */
import mysql from 'mysql2/promise'
import config from './index.js'

// 创建连接池（连接参数由 config/index.js 提供）
const pool = mysql.createPool(config.db)

export default pool
