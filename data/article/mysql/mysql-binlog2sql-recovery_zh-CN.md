---
title: 使用 binlog2sql 工具在线恢复数据
date: 2023-10-25
description: 验证 binlog2sql 工具是否可以快速恢复数据。
tags:
  - MySQL
  - 数据恢复
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MySQL.png
---

# 背景

生产数据库执行 SQL 脚本，一般会经过正规的审批流程才能运行。但有些情况是例外的，业务部门在提出一些删除数据的需求后打算撤回，或者在运营后台不小心删除了一些数据，然后找到 DBA 团队协助，希望能恢复数据。

经调研，binlog2sql 是大众点评开源的一款用于解析 MySQL binlog 的工具，根据不同选项，可以得到原始SQL、回滚SQL、去除主键的INSERT SQL 等，适用于数据快速回滚（闪回）和主从切换后新 Master 丢数据的修复工作。

# 目标

验证 binlog2sql 工具是否可以快速恢复数据。

# 步骤

## 准备工作

安装 binlog2sql 工具。

```bash
> git clone https://github.com/danfengcao/binlog2sql.git && cd binlog2sql

# > yum install python3-pip
# > whereis pip
# > pip3.6 install -r requirements.txt
> pip install -r requirements.txt
```

MySQL 服务端配置以下参数，请注意，binlog2sql 仅支持 row 格式。

```properties
[mysqld]
server_id = 1
log_bin = /var/log/mysql/mysql-bin.log
max_binlog_size = 1G
binlog_format = row
binlog_row_image = full
```

指定执行脚本的数据库用户授权。

```sql
-- SELECT 权限：查询 information_schema.COLUMNS
-- REPLICATION SLAVE：通过 BINLOG_DUMP 协议获取 binlog 内容
-- REPLICATION CLIENT：执行 SHOW MASTER STATUS 获取 binlog 信息
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO user
```

准备一张用户表 user，并填充 1W 条数据。

```sql
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(10) DEFAULT NULL,
  `gmt_create` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4

DELIMITER $$

CREATE PROCEDURE InsertRandomData()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE randomName CHAR(10);
    DECLARE randomDate DATE;

    WHILE i <= 10000 DO
        -- 生成随机 name (随机字符串)
        SET randomName = CONCAT(
            CHAR(FLOOR(RAND() * 26) + 65), 
            CHAR(FLOOR(RAND() * 26) + 65), 
            CHAR(FLOOR(RAND() * 26) + 65), 
            CHAR(FLOOR(RAND() * 26) + 65), 
            CHAR(FLOOR(RAND() * 26) + 65)
        );

        -- 生成随机日期 (2013-11-11 起始，随机范围约为一年内)
        SET randomDate = DATE_ADD('2023-01-01', INTERVAL FLOOR(RAND() * 365) DAY);

        -- 插入数据
        INSERT INTO `user` (`name`, `gmt_create`) VALUES (randomName, randomDate);

        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

-- 调用存储过程
CALL InsertRandomData();
```

查看大于 11 月份的数据总数，共 363 条。
```sql
mysql > SELECT count(*) FROM user WHERE gmt_create > '2023-11-01 00:00:00';

+----------+
| count(*) |
+----------+
|      363 |
+----------+
```

模拟误删除，假设在 15:30 左右删除了 11 月份之后的数据。
```sql
mysql > DELETE FROM user WHERE gmt_create > '2023-11-01 00:00:00';
```

## 恢复数据

查看主库 binlog 状态，最新的文件为 mysql-bin.000003。

```sql
-- 低版本使用 SHOW MASTER STATUS;
mysql > SHOW BINARY LOGS;
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000001 |      1871 | No        |
| mysql-bin.000002 |       181 | No        |
| mysql-bin.000003 |    917878 | No        |
+------------------+-----------+-----------+
3 rows in set (0.04 sec)
```

筛选出需要回滚的SQL，误操作人一般知道大致的误操作时间，我们首先根据时间做一次过滤。

```bash
shell> python binlog2sql/binlog2sql.py -h地址 -P端口 -u用户 -p'密码' -d库民 -t表名 --start-file='mysql-bin.000003' --start-datetime='2023-11-02 15:00:00' --stop-datetime='2023-11-02 16:00:00' > /tmp/raw.sql

raw.sql输出：
DELETE FROM `test`.`user` WHERE `gmt_create`='2023-11-01 00:00:00' AND `id`=1351 AND `name`='TPUDJ' LIMIT 1; #start 105311 end 262311 time 2023-11-02 15:31:10
DELETE FROM `test`.`user` WHERE `gmt_create`='2023-11-01 00:00:00' AND `id`=1352 AND `name`='YKIIS' LIMIT 1; #start 105311 end 262311 time 2023-11-02 15:31:10
...
DELETE FROM `test`.`user` WHERE `gmt_create`='2023-12-31 00:00:00' AND `id`=1714 AND `name`='SHKBC' LIMIT 1; #start 105311 end 265754 time 2023-11-02 15:31:10
```

根据 raw.sql 的位置信息，可以判断误操作的 SQL 来自同一个事务，准确位置在 105311-265754 之间，根据位置过滤，使用 -B 选项生成回滚 SQL。

```bash
shell> python binlog2sql/binlog2sql.py -h地址 -P端口 -u用户 -p'密码' -d库民 -t表名 --start-file='mysql-bin.000003' --start-position=105311 --stop-position=265754 -B > /tmp/rollback.sql

rollback.sql输出：
INSERT INTO `test`.`user`(`gmt_create`, `id`, `name`) VALUES ('2023-11-01 00:00:00', 1351, 'TPUDJ'); #start 105311 end 262311 time 2023-11-02 15:31:10
INSERT INTO `test`.`user`(`gmt_create`, `id`, `name`) VALUES ('2023-11-01 00:00:00', 1352, 'YKIIS'); #start 105311 end 262311 time 2023-11-02 15:31:10
...
INSERT INTO `test`.`user`(`gmt_create`, `id`, `name`) VALUES ('2023-12-31 00:00:00', 1714, 'SHKBC'); #start 105311 end 265754 time 2023-11-02 15:31:10
```

## 结果验证

确认回滚 SQL 总行数是否对应误删除的 363 条。

```bash
shell> wc -l /tmp/rollback.sql

363 /tmp/rollback.sql
```

与业务方确认回滚 SQL 没问题，执行回滚语句。登录 MySQL，确认回滚成功。
```sql
shell> mysql -h地址 -P端口 -u用户 -p'密码' < /tmp/rollback.sql

mysql> SELECT count(*) FROM user WHERE gmt_create > '2023-11-01 00:00:00';
+----------+
| count(*) |
+----------+
|    363   |
+----------+
```

# 结论

binlog2sql 适用于在线恢复误操作的数据，但不适用于以下情况：
1. **数据恢复建议控制在 50W 以内**，数据量越大，逆向生成的语句越多，超过这个数值，恢复时间可能会超过 15 分钟。
2. **不支持 DDL 恢复操作**。因为即使在 row 模式下，binlog对于 DDL 操作不会记录每行数据的变化。要实现 DDL 快速回滚，必须修改 MySQL 源码，使得在执行 DDL 前先备份老数据。阿里林晓斌团队提交了 patch 给 MySQL 官方，相关实现方案可以查阅 [MySQL闪回方案讨论及实现](https://www.iteye.com/blog/dinglin-1539167)。
3. 根据官方说法，在线召回数据推荐使用 binlog2sql 工具，离线解析使用 mysqlbinlog 工具，MySQL 闪回特性最早由阿里彭立勋开发，具体可以查阅 [MySQL Flashback Feature](http://www.penglixun.com/database/mysql_flashback_feature.html)。
