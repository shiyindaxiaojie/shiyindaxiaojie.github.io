---
title: Online Data Recovery Using binlog2sql Tool
date: 2023-10-25
description: binlog2sql is suitable for online recovery of mistakenly operated data, but
tags:
  - MySQL
  - Data Recovery
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MySQL.png
---

# Background

Production database SQL scripts typically require formal approval before execution. But exceptions occur - business departments withdraw deletion requests or accidentally delete data in admin panels, then ask DBA team for recovery.

binlog2sql is an open-source tool from Dianping for parsing MySQL binlog. Depending on options, it generates original SQL, rollback SQL, or INSERT SQL without primary keys - suitable for data flashback and fixing lost data after master-slave failover.

# Objective

Verify if binlog2sql can quickly recover data.

# Steps

## Preparation

Install binlog2sql:

```bash
> git clone https://github.com/danfengcao/binlog2sql.git && cd binlog2sql
> pip install -r requirements.txt
```

Configure MySQL (binlog2sql only supports row format):

```properties
[mysqld]
server_id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = row
binlog_row_image = full
```

Grant required permissions:

```sql
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO user
```

Create user table with 10K records, simulate accidental deletion of 363 records from November onward:

```sql
mysql> DELETE FROM user WHERE gmt_create > '2023-11-01 00:00:00';
```

## Data Recovery

Check master binlog status:

```sql
mysql> SHOW BINARY LOGS;
+------------------+-----------+
| Log_name         | File_size |
+------------------+-----------+
| mysql-bin.000003 |    917878 |
+------------------+-----------+
```

Filter SQL to rollback by time range:

```bash
> python binlog2sql.py -h host -u user -p'pass' -d db -t table --start-file='mysql-bin.000003' --start-datetime='2023-11-02 15:00:00' --stop-datetime='2023-11-02 16:00:00' > /tmp/raw.sql
```

Based on raw.sql position info, generate rollback SQL using -B option:

```bash
> python binlog2sql.py ... --start-position=105311 --stop-position=265754 -B > /tmp/rollback.sql
```

## Verification

Confirm rollback SQL count matches deleted records:

```bash
> wc -l /tmp/rollback.sql
363 /tmp/rollback.sql
```

Execute rollback and verify:

```sql
mysql> SELECT count(*) FROM user WHERE gmt_create > '2023-11-01 00:00:00';
+----------+
| count(*) |
+----------+
|      363 |
+----------+
```

# Conclusion

binlog2sql is suitable for online recovery of mistakenly operated data, but:

1. **Recommend under 500K records** - larger data means longer recovery time (possibly 15+ minutes)
2. **DDL recovery not supported** - even in row mode, binlog doesn't record DDL row-by-row changes
3. For online recall use binlog2sql; for offline parsing use mysqlbinlog
