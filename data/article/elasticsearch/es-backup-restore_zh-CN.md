---
title: Elasticsearch 索引备份与恢复方案
date: 2023-05-16
description: 有时候需要对 Elasticsearch 集群进行备份，或者恢复到其他集群。
tags:
  - 搜索引擎
  - 解决方案
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# 背景

有时候需要对 Elasticsearch 集群进行备份，或者恢复到其他集群。

# 方案

以下提供两种方案：使用 Elasticsearch 自带的 SNAPSHOT 快照机制，或者利用 elasticsearch-dump 工具完成。

## 使用快照与恢复功能

将索引数据备份到其他文件存储，恢复时先恢复快照，再恢复索引。

在 elasticsearch.yaml 配置快照存储路径。

```yaml
path.repo: ["/path/to/snapshot"]
```

注册快照存储库。
```json
PUT /_snapshot/my_backup
{
  "type": "fs",
  "settings": {
    "location": "/path/to/snapshot"
  }
}
```

创建快照。

```json
# 全量备份
PUT /_snapshot/my_backup/snapshot_cluster?wait_for_completion=true

# 按需备份
PUT /_snapshot/my_backup/snapshot_demo_index?wait_for_completion=true
{
  "indices": "demo_*",
  "ignore_unavailable": true
  "include_global_state": false.
  "metadata": {
    "author": "mengxiangge",
    "description": "backup before reindex"
  }
}
```

恢复快照。

```json
# 全量恢复
POST /_snapshot/my_backup/snapshot_cluster/_restore

# 按需恢复
POST /_snapshot/my_backup/snapshot_demo_index/_restore
```

## 使用 elasticsearch-dump 工具

elasticsearch-dump 是一个开源的命令行工具，用于将 Elasticsearch 索引数据导出为 JSON 文件，或将 JSON 文件导入 Elasticsearch 中。项目地址可以查阅[链接](https://github.com/taskrabbit/elasticsearch-dump)。

假设源数据节点为 10.2.0.1:9200，迁移到 10.2.1.1:9200。

```bash
# 迁移 Analyzer、Settings、Mapping
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=analyzer
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=settings
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=mapping

# 迁移数据
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=data
```