---
title: MySQL Emoji Storage Error Troubleshooting
date: 2023-02-10
description: Using MySQL to store emoji in specific scenarios (posts, comments, signatures).
tags:
  - MySQL
  - Character Set
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/logo/MySQL.png
---

# Problem Description

Using MySQL to store emoji in specific scenarios (posts, comments, signatures). Server config and CREATE TABLE both use `utf8mb4`, but still throws:
`java.sql.SQLException: Incorrect string value: '\xF0\x9F\x92\x94' for column 'name' at row 1`.

# Root Cause Analysis

MySQL's `utf8` encoding supports max 3 bytes, but emoji require 4 bytes - early versions didn't implement true UTF-8. MySQL supports `utf8mb4` from version `5.5.3`.

We verified Server version and config used `utf8mb4`, checked client connection parameters, no issues found.

Deploying to self-hosted MySQL worked fine, but cloud database failed - determined to be cloud vendor configuration issue.

Since cloud database doesn't support `character-set-client-handshake` or `init_connect` parameters, we used `HikariCP` connection pool to pass `SET NAMES utf8mb4` command before connection initialization:

```yaml
spring:
  datasource:
    hikari:
      connection-init-sql: SET NAMES utf8mb4
```

Problem solved after config change.

# Post-Incident Review

Cloud vendor databases use proxy that hides client-server details, making root cause difficult to identify. For MySQL character storage issues, we typically troubleshoot:

## Check Client Session Character Set

Use HikariCP to run `SET NAMES utf8mb4` before connection initialization.

## Check MySQL Server Character Set

```sql
SHOW VARIABLES WHERE VARIABLE_NAME LIKE 'character_set_database' OR VARIABLE_NAME LIKE 'collation%';
```

If not utf8mb4, adjust MySQL config:

```conf
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
init_connect='SET NAMES utf8mb4'
```

## Check JDBC Connection

Remove `characterEncoding` option to let MySQL connector use server character set:

```
jdbc:mysql://localhost:3306/db?useUnicode=true&zeroDateTimeBehavior=convertToNull
```

## Modify Historical Data Character Set

For existing `utf8` data, convert database, table, column types to `utf8mb4`:

```sql
ALTER DATABASE <database_name> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE <table_name> CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
