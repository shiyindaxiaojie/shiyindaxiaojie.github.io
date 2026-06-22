---
title: MySQL Slave Replication Lag Solutions
date: 2022-06-15
description: MySQL master on cloud vendor with high specs: 32U 128G 2.5T, using 1.5T data + 0.5T logs.
tags:
  - Database
  - Replication
  - MySQL
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MySQL.png
---

# Problem Description

MySQL master on cloud vendor with high specs: `32U 128G 2.5T`, using 1.5T data + 0.5T logs.

MySQL slave self-hosted on K8s using native MySQL image, specs: `4U 24G`.

Due to large spec gap, slave frequently experiences sync delays or errors.

# Root Cause Analysis

After analyzing master and slave, we identified optimizable configurations:

1. **Enable parallel replication**: Adjust threads based on slave config for improved parallelism - `slave_parallel_mode=optimistic` and `slave_parallel_threads=4`
2. **Skip error codes**: Avoid replication interruption from non-critical errors like duplicate keys (1062), missing data (1032), missing tables (1146)
3. **Skip unnecessary tables**: Master has backup/history tables with large data unnecessary for slave - use `replicate_ignore_db` and `replicate_wild_ignore_table`
4. **Buffer Pool optimization**: Increase InnoDB cache size - `innodb_buffer_pool_size=16G`
5. **Binlog cache optimization**: Increase binlog cache sizes - `binlog_file_cache_size=16M`, `binlog_cache_size=4M`

# Solution

Optimized my.cnf configuration:

```bash
[mysqld]
## Optimization 1: Enable parallel replication
slave_parallel_mode=optimistic
slave_parallel_threads=4
slave_parallel_max_queued=10M

## Optimization 2: Skip error codes
slave_skip_errors=1062,1032,1146

## Optimization 3: Skip unnecessary tables
replicate_ignore_db=database_name
replicate_wild_ignore_table=database_name.table_name%
replicate_wild_ignore_table=information_schema.*

## Optimization 4: Increase InnoDB buffer pool
innodb_buffer_pool_size=16G

## Optimization 5: Increase binlog cache
binlog_file_cache_size=16M
binlog_stmt_cache_size=32M
binlog_cache_size=4M
binlog_commit_wait_count=4
expire_logs_days=1

## Other optimizations (business dependent)
innodb_flush_log_at_trx_commit=0
innodb_autoinc_lock_mode=2
innodb_lock_wait_timeout=500
```

From practical experience, skipping unnecessary tables is most effective since it reduces replication work at the source, naturally resolving sync delay issues.
