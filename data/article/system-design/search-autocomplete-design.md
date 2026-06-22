---
title: Search Autocomplete System Design
date: 2023-10-25
description: Design a search autocomplete system that returns Top K query suggestions (the most frequently searched queries).
tags:
  - System Design
  - Trie
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/search-auto-complete.png
---

# Scenario

Design a search autocomplete system that returns Top K query suggestions (the most frequently searched queries).

Requirements:
1. Prefix match only.
2. Return results within 100ms after a user types.
3. Return 5 suggestions, ranked by historical query frequency.
4. Support 10 million daily active users (DAU).

# Estimation

Assume each user searches 20 times per day, and each query is 4 characters.
With UTF-8 encoding (~3 bytes per Chinese character), each query is about 4 * 3 = 12 bytes.

Each time the user types one character, the client sends a request to fetch suggestions. For example, typing "原神启动" would send 4 requests:
```bash
_search?q=原
_search?q=原神
_search?q=原神启
_search?q=原神启动
```

With 10 million DAU, the QPS is:
10,000,000 * 20 * 4 / 24 / 60 / 60 ≈ 9,200/s.
If we assume peak traffic is 2x, peak QPS ≈ 18,400/s.




# Design


## Overall architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API GW    │────▶│  Autocomplete│
│             │     │   + CDN     │     │   Service   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
             ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
             │   Trie      │           │   Query     │           │   Aggregator│
             │   Cache     │           │   Log       │           │   Service   │
             └─────────────┘           └─────────────┘           └─────────────┘
```

## Core data structure: Trie

Trie (prefix tree) is the core data structure for autocomplete and supports O(p) prefix lookups (p is the prefix length).

```
                    root
                   /    \
                  原      今
                 /         \
                神          天
               /             \
              启              天
             /                 \
            动 [freq:1000]      气 [freq:500]
```

### Optimization: cache Top K on each node

Each node stores the Top K hottest queries for that prefix to avoid traversing the entire subtree.

```java
class TrieNode {
    Map<Character, TrieNode> children;
    List<String> topQueries;  // cache Top K
    boolean isEnd;
}
```

## Data collection and aggregation

### Real-time logging
```
用户搜索 → Kafka → Flink/Spark Streaming → 聚合统计
```

### Offline batch
```
搜索日志 → Hadoop/Spark → 词频统计 → 更新 Trie
```

### Aggregation strategies
- **Time decay**: recent searches have higher weight
- **Denoising**: filter low-frequency or sensitive terms
- **Popularity scoring**: combine search count and CTR

## Storage options

### Option 1: In-memory
Load the entire Trie into memory.

**Pros**: fast queries
**Cons**: high memory usage; needs replicas

### Option 2: Distributed cache
Store Trie data in Redis.

```
Key: prefix:原神
Value: ["原神启动", "原神攻略", "原神下载", ...]
```

### Option 3: Sharding
Shard by the first character of the prefix across servers.

## Performance optimizations

### 1. Client-side
- **Debounce**: request after the user stops typing for 200ms
- **Local cache**: cache recent results

### 2. Server-side
- **CDN cache**: cache hot prefixes in CDN
- **Multi-level cache**: local cache + Redis + Trie
- **Async updates**: updates should not block queries

### 3. Sampling
Sample queries instead of logging every search (e.g., 1/10).

## Trie updates

### Incremental updates
Update frequency statistics hourly/daily and merge into the Trie incrementally.

### Full rebuild
Periodically (e.g., weekly) rebuild the Trie to ensure consistency.

```
┌─────────────┐     ┌─────────────┐
│  Trie v1    │     │  Trie v2    │
│  (serving)  │     │  (building) │
└─────────────┘     └─────────────┘
       │                   │
       └───── 切换 ────────┘
```

# Summary

| Component | Choice |
|------|----------|
| Data structure | Trie |
| Cache | Redis / local cache |
| Logging | Kafka |
| Real-time aggregation | Flink / Spark Streaming |
| Offline compute | Hadoop / Spark |

Key challenges:
1. **Low latency**: return within 100ms
2. **Freshness**: hot queries should surface quickly
3. **Accuracy**: filter noise and sensitive terms