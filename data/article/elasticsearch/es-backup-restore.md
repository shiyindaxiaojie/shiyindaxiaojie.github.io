---
title: Elasticsearch Index Backup and Restore Solutions
date: 2023-05-16
description: Sometimes you need to backup Elasticsearch clusters or restore to other clusters.
tags:
  - Search Engine
  - Solutions
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# Background

Sometimes you need to backup Elasticsearch clusters or restore to other clusters.

# Solutions

Two approaches: using Elasticsearch's built-in SNAPSHOT mechanism, or using elasticsearch-dump tool.

## Using Snapshot and Restore

Backup index data to other file storage, restore snapshot first then restore index.

Configure snapshot storage path in elasticsearch.yaml:

```yaml
path.repo: ["/path/to/snapshot"]
```

Register snapshot repository:

```json
PUT /_snapshot/my_backup
{
  "type": "fs",
  "settings": {
    "location": "/path/to/snapshot"
  }
}
```

Create snapshot:

```json
# Full backup
PUT /_snapshot/my_backup/snapshot_cluster?wait_for_completion=true

# Selective backup
PUT /_snapshot/my_backup/snapshot_demo_index?wait_for_completion=true
{
  "indices": "demo_*",
  "ignore_unavailable": true,
  "include_global_state": false,
  "metadata": {
    "author": "mengxiangge",
    "description": "backup before reindex"
  }
}
```

Restore snapshot:

```json
# Full restore
POST /_snapshot/my_backup/snapshot_cluster/_restore

# Selective restore
POST /_snapshot/my_backup/snapshot_demo_index/_restore
```

## Using elasticsearch-dump Tool

elasticsearch-dump is an open-source command-line tool for exporting Elasticsearch index data to JSON files or importing JSON files into Elasticsearch. See [project](https://github.com/taskrabbit/elasticsearch-dump).

Assuming source node is 10.2.0.1:9200, migrating to 10.2.1.1:9200:

```bash
# Migrate Analyzer, Settings, Mapping
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=analyzer
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=settings
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=mapping

# Migrate data
elasticdump --input=http://10.2.0.1:9200/my_index --output=http://10.2.1.1:9200/my_index --type=data
```
