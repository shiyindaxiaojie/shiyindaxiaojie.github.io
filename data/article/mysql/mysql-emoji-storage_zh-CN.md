---
title: MySQL 存储 emoji 报错问题排查
date: 2023-02-10
description: 我们使用 MySQL 在特定业务场景（帖子、评论、个人签名）存储 emoji 表情。
tags:
  - MySQL
  - 字符集
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/logo/MySQL.png
---

# 问题描述

我们使用 MySQL 在特定业务场景（帖子、评论、个人签名）存储 emoji 表情。Server 配置和建表语句统一使用 `utf8mb4`，仍然抛出如下错误：
`java.sql.SQLException: Incorrect string value: '\xF0\x9F\x92\x94' for column 'name' at row 1`。

# 原因分析

MySQL 的 `utf8` 编码最多支持 3 个字节，而 emoji 表情需要占用 4 个字节，在早期的版本并没有实现真正意义上的 `utf8` 字符集。MySQL 从 `5.5.3` 版本开始支持 `utf8mb4` 字符集。

我们检查了 Server 的版本和配置，确定字符集用的是 `utf8mb4`，也检查了客户端连接 Server 的参数，也没发现其他异常。

将代码部署到自建的 MySQL 环境，可以正常存储，但是部署到云数据库 MySQL，就会报错，基本上判断是云厂商配置的问题。

因云数据库的环境不支持在 Server 端配置 `character-set-client-handshake` 或者 `init_connect` 参数，我们使用了 `HikariCP` 数据库连接池框架，在数据库连接池框架初始化连接之前传入 `set names utf8mb4; `命令处理，代码片段如下。

```yaml
spring:
  datasource:
    hikari:
      connection-init-sql: SET NAMES utf8mb4
```

修改配置后，问题解决。

# 故障复盘

云厂商数据库通过 proxy 代理，屏蔽了客户端和服务器之间的细节，导致我们很难排查出问题的根本原因。对于 MySQL 的字符存储问题，我们通常会通过以下方式来排查问题。

## 检查客户端代码的会话字符集

例如 HikariCP 数据库连接池框架，在数据库连接池框架初始化连接之前传入 `set names utf8mb4; `命令，让客户端告知 Server，使用 `utf8mb4` 字符集。

## 检查 MySQL 服务端的字符集

通过以下语句查看 MySQL 服务端的字符集是否为 `utf8mb4`。

```sql
SHOW VARIABLES WHERE VARIABLE_NAME LIKE 'character_set_database' OR VARIABLE_NAME LIKE 'collation%';
```

如果不是，调整 MySQL 的配置文件，关键代码片段如下。

```
[client]
default-character-set = utf8mb4

[mysql]
default-character-set = utf8mb4

[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
init_connect='SET NAMES utf8mb4'
character-set-client-handshake = FALSE
```

重启 MySQL Server，重新确认 MySQL 服务端的字符集是否修改成功。

## 检查 JDBC 连接信息

去除 `characterEncoding` 选项，让 MySQL 连接器选择服务端的字符集。

```sql
jdbc:mysql://localhost:3306/db?useUnicode=true&&zeroDateTimeBehavior=convertToNull&autoReconnect=true
```

## 修改历史数据的字符集

对于存储了字符编码为 `utf8` 的历史数据，如果要支持 `utf8mb4` ，需要将已经存在的数据库、表、列的类型修改成 `utf8mb4`。

首先，调整数据库的默认字符集。

```sql
ALTER DATABASE <database_name> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

修改表或者列的字符集。

```sql
ALTER TABLE <table_name> CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

如果您不希望修改整个表的字符集，可以选择指定 Column 进行调整。

```sql
ALTER TABLE <table_name> MODIFY COLUMN <column_name> VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```