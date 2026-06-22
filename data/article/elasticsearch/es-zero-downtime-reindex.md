---
title: Elasticsearch Zero-Downtime Index Migration
date: "2023-05-15 15:05:01 +0800"
description: In production environment providing services, discovered unreasonable index design for core business in Elasticsearch cluster.
tags: ["Search Engine", "Solutions", "Elasticsearch"]
categories: ["Learning Summary"]
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# Background

In production environment providing services, discovered unreasonable index design for core business in Elasticsearch cluster. Data migration needed without service restart.

# Solution

Use Alias to provide external service.

Create new index with proper Mapping, then perform reindex migration.

For example, set alias `my_index_alias` for index `my_index`:

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

Create new index `my_index_v2`, adjust mapping as needed:

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

Reindex data from old index `my_index` to new index `my_index_v2`:

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

Once new index is ready and all data migrated, update alias `my_index_alias` to point to new index `my_index_v2`:

```json
POST _aliases
{
  "actions": [
    { "remove": { "index": "my_index", "alias": "my_index_alias" } },
    { "add": { "index": "my_index_v2", "alias": "my_index_alias" } }
  ]
}
```

During the period from `reindex` migration to `aliases` switch, if business writes to old index `my_index`, data inconsistency may occur. Recommend executing `POST _reindex` and `POST _aliases` together during off-peak hours.
