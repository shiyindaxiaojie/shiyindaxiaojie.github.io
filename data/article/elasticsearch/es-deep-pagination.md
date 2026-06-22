---
title: Elasticsearch Deep Pagination Solutions
date: 2023-05-25
description: For small data pagination, use from+size.
tags:
  - Search Engine
  - Solutions
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# Background

In Elasticsearch, pagination queries are common requirements, especially when processing large amounts of data. To improve query efficiency, Elasticsearch provides various pagination solutions for different scenarios.

# Solutions

Elasticsearch has 3 main pagination methods:

| Method               | Limitations                                                      | Use Cases                |
| -------------------- | ---------------------------------------------------------------- | ------------------------ |
| `from+size` query    | Supports random page jumping, within `max_result_window`         | Small data range queries |
| `search_after` query | Only supports forward pagination, can exceed `max_result_window` | App scroll down for news |
| `scroll` query       | Large data pagination, but low real-time                         | Batch data/log export    |

## from+size for Small Data Range

`from` specifies starting position in result set, `size` specifies total records to return. Assuming index `my_index`, query documents with name "Dreamsinger" returning 10 records:

```json
GET my_index/_search
{
  "from": 1,
  "size": 10,
  "query": {
    "match": {
      "name": "Dreamsinger"
    }
  }
}
```

When `from+size` exceeds `max_result_window` (default 10000), error returned:

```json
{
  "error": {
    "root_cause": [
      {
        "type": "illegal argument exception",
        "reason": "Result window is too large, from + size must be less than or equal to: [10000] but was [10001]..."
      }
    ]
  }
}
```

Conclusion: `from+size` only suitable for small data queries, cannot continue pagination beyond `max_result_window`.

## search_after for Forward Scrolling

`search_after` is sort-field-based pagination, suitable for querying large data in specific order (e.g., timestamp, ID). Unlike traditional pagination, it doesn't use `from` but queries based on last record's sort value. Usually used with Point In Time (PIT) for data consistency.

Create PIT before pagination:

```json
POST /my_index/_pit?keep_alive=1m
```

Returns PIT ID:

```json
{
  "id": "ABCDEFG..."
}
```

Query next page with `search_after`:

```json
GET /_search
{
  "size": 10,
  "query": {
    "match_all": {}
  },
  "pit": {
    "id": "ABCDEFG...",
    "keep_alive": "1m"
  },
  "sort": [
    {
      "timestamp": {
        "order": "asc"
      }
    }
  ],
  "search_after": [
    1633036800000
  ]
}
```

Delete PIT after completion:

```json
DELETE /_pit
{
  "id": "ABCDEFG..."
}
```

Conclusion: `search_after` bypasses `max_result_window` limit regardless of data volume. Drawback: only supports forward pagination, requires previous page's sort values, and sort field must be unique.

## scroll Query

`scroll` query is for batch large data retrieval, more efficient than traditional pagination when traversing entire index.

`scroll` maintains scrolling context instead of recalculating position. Each result contains new `scroll_id` for next batch.

```json
POST /my_index/_search?scroll=1m
{
  "query": {
    "match_all": {}
  },
  "size": 1000
}
```

Use returned `_scroll_id` for subsequent data:

```json
POST /_search/scroll
{
  "scroll": "1m",
  "scroll_id": "DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAA..."
}
```

Release resources after completion:

```json
DELETE /_search/scroll
{
  "scroll_id": ["DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAA..."]
}
```

Conclusion: `scroll` suits batch data export and log analysis, but data isn't real-time, and large data requires sufficient heap memory for context.

# Summary

For small data pagination, use from+size.

When results exceed 10000, recommend search_after.

Not recommended to use scroll for deep pagination due to low real-time and high resource requirements.
