---
title: Elasticsearch Document Version Conflict Solutions
date: 2023-05-18
description: When using _update_by_query for batch updates or _delete_by_query for batch deletes, if a _bulk write happens simultaneously and executes faster, the ...
tags:
  - Search Engine
  - Solutions
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# Background

When using `_update_by_query` for batch updates or `_delete_by_query` for batch deletes, if a `_bulk` write happens simultaneously and executes faster, the batch update/delete version becomes lower than the write version, causing version conflict errors.

# Solutions

Two approaches to avoid version conflicts: external version control with `version=number&version_type=external`, or control via `if_seq_no` and `if_primary_term` parameters.

## External Version Mode

Hand version control to client.

For example, updating `my_index` index:

```json
PUT my_index/_doc/233?version=2&version_type=external
```

When given version=2 is greater than current version=1, update or index operation succeeds.

## Using `if_seq_no` and `if_primary_term` Parameters

Query `if_seq_no` and `if_primary_term` before updating, then pass to update command.

For example, query before updating `my_index`:

```json
GET my_index/_doc/233
```

Returns:

```json
{
  "_index": "my_index",
  "_id": "233",
  "_version": 1,
  "_seq_no": 0,
  "_primary_term": 1
}
```

Pass retrieved `_seq_no` and `_primary_term` to update command:

```json
PUT my_index/_doc/233?if_seq_no=0&if_primary_term=1
```

Execution succeeds.
