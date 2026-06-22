---
title: MySQL 从库同步延迟解决方案
date: 2022-06-15
description: MySQL 主库使用云厂商较高配置，规格为 32U 128G 2.5T，数据空间实际使用 1.5 T，日志空间使用 0.5T，如下图。
tags:
  - 数据库
  - 主从复制
  - MySQL
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MySQL.png
---

# 问题描述

MySQL 主库使用云厂商较高配置，规格为 `32U 128G 2.5T`，数据空间实际使用 `1.5 T`，日志空间使用 `0.5T`，如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/mysql_tencent-cloud-overview.png)

MySQL 从库通过 K8s 自行搭建，使用 MySQL 原生镜像，规格为 `4U 24G`。

由于两者配置差距太大，MySQL 从库经过出现同步延迟或者同步报错的现象，MySQL 从库的 `my.cnf` 配置如下。

```bash
[mysqld]
server_id=服务器唯一标识
# 服务器默认字符集
character_set_server=utf8
# 表名是否忽略大小写：0 表示区分大小写，1 表示不区分大小写，2 表示 Windows 下不区分大小写
lower_case_table_names=1 
# 启用事件调度器：1 表示启用，0 表示禁用。
event_scheduler=1 
# 最大并发连接数
max_connections=10000
# 允许的最大连续连接错误次数
max_connect_errors=200
# 错误日志中记录的最大错误条目数
max_error_count=100
# 允许的最大网络包大小
max_allowed_packet=1G
# 指定中继日志的名称
relay_log=mysqld-relay-bin
# 刷盘时机：0 表示提交事务时不立即刷新，1 表示每次提交事务时都刷新，2 表示每秒刷新一次
innodb_flush_log_at_trx_commit=2
# InnoDB 数据和索引的缓存大小
innodb_buffer_pool_size=4G
# 默认时区
default-time-zone='+8:00'
# 临时目录的位置
tmpdir=/var/lib/mysql/tmp
# 错误日志文件的位置
log-error=/var/lib/mysql/mysql.err
```

# 原因分析

经过对主库和从库的分析，我们整理了一些从库可优化的配置项。
1. **开启并行复制**：根据从库配置调整线程数，提高同步的并行效率，关键配置参数为 `slave_parallel_mode=optimistic` 和 `slave_parallel_threads=4`。
2. **跳过一些错误码**：避免复制过程中因为一些非关键性错误（如重复插入、数据不一致等）而中断，例如 `1062` 重复键，`1032`更新的数据不存在，`1146`访问的表不存在。
3. **跳过不需要的表**：主库存在备份表、历史表，这些表往往数据量较大，从库并不需要这些表数据，可设置 `replicate_ignore_db` 忽略数据库和 `replicate_wild_ignore_table` 忽略指定表。
4. **Buffer Pool优化**：提高 InnoDB 数据和索引的缓存大小，例如 `innodb_buffer_pool_size=16G`。
5. **binlog 缓存优化**：增大 binlog 日志文件的缓存大小、事务缓存大小，例如 `binlog_file_cache_size=16M`、`binlog_cache_size=4M`。


# 解决方案

优化后的 my.cnf 配置文件如下。

```bash
[mysqld]
server_id=服务器唯一标识
# 服务器默认字符集
character_set_server=utf8
# 表名是否忽略大小写：0 表示区分大小写，1 表示不区分大小写，2 表示 Windows 下不区分大小写
lower_case_table_names=1 
# 启用事件调度器：1 表示启用，0 表示禁用。
event_scheduler=1 
# 最大并发连接数
max_connections=10000
# 允许的最大连续连接错误次数
max_connect_errors=200
# 错误日志中记录的最大错误条目数
max_error_count=100
# 允许的最大网络包大小
max_allowed_packet=1G
# 指定中继日志的名称
relay_log=mysqld-relay-bin
# 联接缓存级别。范围从 0 到 8，0 表示禁用缓存，8 表示最大缓存级别。
join_cache_level=8
# 禁用查询缓存
query_cache_size=0
# 超过多少秒记录到慢查询日志
long_query_time=15
# 默认时区
default-time-zone='+8:00'
# 临时目录的位置
tmpdir=/var/lib/mysql/tmp
# 错误日志文件的位置
log-error=/var/lib/mysql/mysql.err

## 优化点一：开启并行复制
# 并行复制模式
slave_parallel_mode=optimistic
# 并行复制的线程数
slave_parallel_threads=4
# 并行复制队列的最大条数
slave_parallel_max_queued=10M

## 优化点二：跳过可能引起中断的错误码
# 在复制过程中遇到指定错误时跳过
slave_skip_errors=1062,1032,1146

## 优化点三：跳过不需要的表
# 忽略复制的数据库名称
replicate_ignore_db=库名
# 忽略复制的表名称
replicate_wild_ignore_table=库名.表名
# 模糊匹配
replicate_wild_ignore_table=库名.表名%
replicate_wild_ignore_table=information_schema.*

## 优化点四：提高 InnoDB 数据和索引的缓存大小
# InnoDB 数据和索引的缓存大小
innodb_buffer_pool_size=16G

## 优化点五：增大 binlog 日志文件的缓存大小、事务缓存大小
# binlog 日志文件的缓存大小
binlog_file_cache_size=16M
# 单个 SQL 语句的缓存大小
binlog_stmt_cache_size=32M
# 单个事务的缓存大小
binlog_cache_size=4M
# 等待提交的数量
binlog_commit_wait_count=4
# 等待提交的时间（微秒）
binlog_commit_wait_usec=200000
# binlog 保留天数
expire_logs_days=1
# 允许在 binlog 中记录创建函数的语句
log_bin_trust_function_creators=1 

## 其他优化（需要看业务是否允许）
# 禁用严格的 InnoDB 模式
innodb_strict_mode=0
# InnoDB 自增锁模式。2 表示松散模式，性能较高。
innodb_autoinc_lock_mode=2
# InnoDB 锁等待超时时间（秒）
innodb_lock_wait_timeout=500
# InnoDB 存储引擎优化
# 刷盘时机：0 表示提交事务时不立即刷新，1 表示每次提交事务时都刷新，2 表示每秒刷新一次
innodb_flush_log_at_trx_commit=0
# 关闭自适应哈希索引
innodb_adaptive_hash_index='OFF'
```

从实际情况来看，跳过不需要的表是最有效的颁发，因为避免了大量数据表的同步，从源头减少了复制工作，同步延迟问题自然得到解决。