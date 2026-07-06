-- 星维设备管理系统 - 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(bcrypt哈希)',
  `nickname` VARCHAR(50) DEFAULT '' COMMENT '昵称',
  `role` ENUM('admin','operator') DEFAULT 'operator' COMMENT '角色: 管理员/操作员',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';

-- 星维设备管理系统 - 设备表
CREATE TABLE IF NOT EXISTS `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '设备名',
  `model` VARCHAR(100) NOT NULL COMMENT '型号',
  `location` VARCHAR(200) NOT NULL COMMENT '位置',
  `status` ENUM('normal','maintenance','scrapped') DEFAULT 'normal' COMMENT '状态: 正常/维保中/已报废',
  `last_maintenance_date` DATE DEFAULT NULL COMMENT '上次维保日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备信息表';

-- 星维设备管理系统 - 用户权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `resource` VARCHAR(50) NOT NULL COMMENT '资源标识，如 device',
  `action` VARCHAR(50) NOT NULL COMMENT '操作: create/read/update/delete',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_user_resource_action` (`user_id`, `resource`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户权限表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('maintenance_months', '11'),
('scrap_months', '12');
