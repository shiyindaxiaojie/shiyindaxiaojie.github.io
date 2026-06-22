---
title: Elasticsearch 文档版本冲突处理方案
date: 2023-05-18
description: 使用 _update_by_query 批量更新或者 _delete_by_query 批量删除，刚好有个 _bulk 批量写入，并且 _bulk 的执行更快，导致批量更新...
tags:
  - 搜索引擎
  - 解决方案
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# 背景

使用 `_update_by_query` 批量更新或者 `_delete_by_query` 批量删除，刚好有个 `_bulk` 批量写入，并且 `_bulk` 的执行更快，导致批量更新或者批量删除的版本比写入的版本要低，造成版本冲突报错。

# 方案

以下提供两种方式避免版本冲突：一是使用 `version=版本号&version_type=external` 外部控制，二是 `if_seq_no` 和 `if_primary_term` 参数控制。

## 基于 `external` 外部模式

将 version 的控制权交由客户端管理。

例如，更新 `my_index` 索引。
```json
PUT my_index/_doc/233?version=2&version_type=external
```

当给定的 version=2，大于当前版本 version=1，执行更新或索引操作成功。

## 使用 `if_seq_no` 和 `if_primary_term` 参数控制

在更新索引之前先查询 `if_seq_no` 和 `if_primary_term` 这两个参数，然后传入更新指令。

例如，更新 `my_index` 索引之前先查询。
```json
GET my_index/_doc/233
```

返回结果。
```json
{
  "_index": "my_index",
  "_id": "233",
  "_version": 1,
  "_seq_no":0, 
  "_primary_term":1
}
```

将获取的 `_seq_no` 和 `_primary_term` 传入更新指令。
```json
PUT my_index/_doc/233?if_seq_no=0&if_primary_term=1
```

执行成功。