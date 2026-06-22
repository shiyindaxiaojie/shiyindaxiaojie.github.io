---
title: Elasticsearch 深度分页查询问题处理方案
date: 2023-05-25
description: 对于小数据量的分页查询，可以使用 from+size 查询。
tags:
  - 搜索引擎
  - 解决方案
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# 背景

在 Elasticsearch 中，分页查询是常见的需求，尤其是在处理大量数据时。为了提高查询效率，Elasticsearch 提供了多种分页方案，适用于不同的场景。笔者根据实际的使用情况整理了相关方案。

# 方案

Elasticsearch 分页查询方式主要有如下 3 种，现给出结论。

| 查询方案 | 用法限制 | 适用场景 | 
| --- | --- | --- | 
| `from+size` 查询 | 支持随机跳转不同分页，不超过 `max_result_window` 值 | 小数据范围查询 |
| `search_after` 查询 | 仅支持向后翻页，可以超过 `max_result_window` 值 | APP向下滑动查看新闻 |
| `scroll` 查询 | 大数据量分页查询，但数据实时性不高 | 批量大数据、日志导出 |

## from+size 小数据范围查询

`from` 参数指定从结果集中的第几条数据开始返回数据，`size` 参数指定返回数据的总量。假设我们有一个索引 `my_index`，并希望查询名字为 "梦想歌" 的文档，且返回 10 条数据。可以使用如下查询：

```json
GET my_index/_search
{
  "from": 1,
  "size": 10,
  "query": {
    "match": {
      "name": "梦想歌"
    }
  }
}
```

当 `from+size` 超过 `max_result_window` 值（默认为 10000 条），返回报错。

```
GET /my_index/_search
{
  "from": 10001,
  "size": 10,
  "query": {
    "match": {
      "name": "梦想歌"
    }
  }
}
```

报错内容如下。

```json
{
  "error"
    "root_cause": [
      {
        "type": "illegal argument exception",
        "reason": "Result window is too large, from + size must be less than or equal to: [10000] but was [10001]. See the scroll api for a more efficient way to request large data sets. This limit can be set by changing the [index.max_result_window] index level setting."
      }
    ],
    ...
}
```

结论：`from+size` 查询只适合小数据范围的查询，超过 `max_result_window` 时，无法继续分页查询。

## search_after 向后滚动翻页

`search_after` 是一个基于排序字段的分页方式，适用于需要按特定顺序（例如时间戳、ID）查询大量数据。与传统的分页不同，它不使用 `from` 参数，而是基于上一页的最后一条记录的排序值进行查询。为了保证分页过程中的数据一致性，`search_after` 通常需要配合 `Point In Time`（PIT）一起使用。

在执行分页查询之前，首先需要创建一个 PIT 来固定查询时刻的数据快照，避免查询过程中数据的变化。

```json
POST /my_index/_pit?keep_alive=1m # 滚动视图保留 1 分钟
```

这个请求会返回一个 `PIT ID`，如下所示：

```json
{
  "id": "ABCDEFG..."
}
```

假设你要按 `timestamp` 字段升序排序，并且已经获取了第一页的最后一条文档的 `timestamp` 值为 `1633036800000`，可以使用如下的 `search_after` 查询获取下一页数据：

```json
GET /_search
{
  "size": 10,
  "query": {
    "match_all": {}
  },
  "pit": {
    "id": "ABCDEFG...",  // 替换为实际的 PIT ID
    "keep_alive": "1m" // 设置 PIT 存活时间
  },
  "sort": [
    {
      "timestamp": {
        "order": "asc"
      }
    }
  ],
  "search_after": [
    1633036800000  // 替换为上一页最后一个文档的 timestamp 值
  ]
}
```

在完成所有分页查询后，调用 DELETE 请求来删除 PIT，从而释放相应的资源。

```json
DELETE /_pit
{
  "id": "ABCDEFG..."  // 替换为实际的 PIT ID
}

```

结论：`search_after` 查询无论数据量有多大，都可以不受 `max_result_window` 限制进行分页（严谨的说法是单次查询不能超过限制）。缺点是仅支持向后分页（不能向前翻页），需要在每次分页时提供上一页的排序值，并确保排序字段的唯一性。

## scroll 查询

`scroll` 查询用于批量获取大量数据，尤其是在需要一次性遍历整个索引或较大数据集时，它比传统的分页查询更高效。

`scroll` 通过维护一个滚动上下文来支持分页的，而不是重新计算分页的位置。每次返回的结果包含一个新的 `scroll_id`，我们可以用它来继续获取下一批数据。

```json
POST /my_index/_search?scroll=1m
{
  "query": {
    "match_all": {}
  },
  "size": 1000  // 每次批量返回 1000 个文档
}
```

返回值示例如下，其中，`_scroll_id` 用于标识当前查询的滚动上下文。

```json
{
  "_scroll_id": "DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAA...",
  "hits": {
    "total": {
      "value": 100000, // 共有 100000 个文档需要分页获取
      "relation": "eq"
    },
    "max_score": null,
    "hits": [
      // 文档...
    ]
  }
}
```

使用返回的 `_scroll_id` 来请求后续数据。

```json
POST /_search/scroll
{
  "scroll": "1m",
  "scroll_id": "DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAA..."
}
```

所有数据获取完毕后，应该通过 Scroll API 来释放资源。

```json
DELETE /_search/scroll
{
  "scroll_id": ["DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAA..."]
}
```

结论：`scroll` 查询适合用于批量数据导出、日志分析等场景，但是查询的过程中，返回的数据是非实时的，并且数据量较大时，需要有足够的堆内存空间来保留上下文。

# 总结

对于小数据量的分页查询，可以使用 from+size 查询。

当分页结果超过 10000 条结果时，则推荐使用 search_after 查询。

不推荐使用 scroll 查询进行深度分页，因为实时性不高，对资源要求高。