---
title: Elasticsearch 索引零停机变更方案
date: '2023-05-15 15:05:01 +0800'
description: 在对外提供服务的线上环境中，发现 Elasticsearch 集群中核心业务涉及的索引设计不合理，需要做数据迁移，但不允许重启服务。
tags: ['搜索引擎', '解决方案', 'Elasticsearch']
categories: ['学习总结']
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# 背景

在对外提供服务的线上环境中，发现 Elasticsearch 集群中核心业务涉及的索引设计不合理，需要做数据迁移，但不允许重启服务。

# 方案

使用 Alias 别名对外提供服务。

新建索引并设定好 Mapping，然后进行数据 reindex 迁移操作。

例如，设置索引 `my_index` 的 Alias 别名为 `my_index_alias`。

```json
PUT my_index
{
    "aliases": {
        "my_index_alias": {} 
    },
    "settings": {
        "refresh_interval": "30s",
        "number_of_shards": 1,
        "number_of_replicas": 0
    }
}
```

创建新索引 `my_index_v2`，根据需要调整 mapping 配置。

```json
PUT my_index_v2
{
    "aliases": {},
    "settings": {
        "refresh_interval": "30s",
        "number_of_shards": 3,
        "number_of_replicas": 0
    }
}
```

将数据从旧索引 `my_index` 重索引到新索引 `my_index_v2`。

```json
POST _reindex
{
  "source": {
    "index": "my_index"
  },
  "dest": {
    "index": "my_index_v2"
  }
}
```

当确认新索引已经准备就绪，并且所有数据都已经成功迁移后，更新别名 `my_index_alias` 以指向新索引 `my_index_v2`。

```json
POST _aliases
{
  "actions": [
    { "remove": { "index": "my_index", "alias": "my_index_alias" } },
    { "add": { "index": "my_index_v2", "alias": "my_index_alias" } }
  ]
}
```

在 `reindex` 迁移索引到 `aliases` 更换别名指向的期间，如果有业务往旧索引 `my_index`写入数据，可能会导致数据不一致，建议将 `POST _reindex` 和 `POST _aliases` 放在一起执行，并在低峰期执行。