---
title: Web Crawler System Design
date: 2023-08-25
description: Design a web crawler system that fetches web pages and their content from the Internet.
tags:
  - System Design
  - Crawler
  - DFS
  - BFS
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/web-crawler.png
---

# Scenario

Design a web crawler system that fetches web pages and their content from the Internet.

Requirements:
1. Given seed URLs, crawl pages and discover links
2. Configurable crawl depth and rate
3. Respect robots.txt
4. Avoid duplicate crawling
5. Crawl 1 billion pages per month

# Estimation

- Monthly pages: 1,000,000,000
- Daily pages: 1,000,000,000 / 30 ≈ 33,000,000/day
- QPS: 33,000,000 / 86400 ≈ 382 pages/s
- Peak QPS: ~800 pages/s

Storage estimation:
- Average page: 500KB (HTML + metadata)
- Monthly storage: 1B × 500KB ≈ 500TB
- Requires compression and incremental updates

# Design

## Overall architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Seed URLs  │────▶│   URL       │────▶│   URL       │
│             │     │  Frontier   │     │  Fetcher    │
└─────────────┘     └─────────────┘     └─────────────┘
                          ▲                    │
                          │                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   URL       │◀────│   Content   │
                    │  Extractor  │     │   Parser    │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Storage   │
                                        │   (S3/HDFS) │
                                        └─────────────┘
```

## Core components

### 1. URL Frontier (crawl queue)

Manages the queue of URLs to be crawled:
- **Priority scheduling**: crawl important pages first
- **Politeness**: enforce delay per host/domain
- **Deduplication**: avoid adding duplicates

Data structure:
```
┌─────────────────────────────────────────┐
│              URL Frontier               │
├─────────────────────────────────────────┤
│  Priority Queue                         │
│    ├── P1: news.com, tech.com           │
│    ├── P2: blog.com, forum.com          │
│    └── P3: other sites                  │
├─────────────────────────────────────────┤
│  Per-host Queue                         │
│    ├── news.com: [url1, url2, ...]      │
│    └── tech.com: [url3, url4, ...]      │
└─────────────────────────────────────────┘
```

### 2. URL Fetcher

- Multi-threaded fetching
- Support HTTP/HTTPS
- Reasonable timeouts and retries
- Respect robots.txt

### 3. Content Parser

- Parse HTML and extract text
- Extract links
- Handle different encodings

### 4. URL Extractor

- Extract new links from pages
- URL normalization (remove fragments, canonicalize)
- Filter invalid links

## Traversal strategies

### BFS (Breadth-first)

Start from seed pages and expand level by level.

**Pros**: good for discovering popular pages
**Use cases**: search engine crawlers

### DFS (Depth-first)

Crawl deep along links and backtrack.

**Pros**: lower memory footprint
**Use cases**: deep crawling within a specific site

## URL deduplication

### Option 1: HashSet

```java
Set<String> visited = new HashSet<>();
```
**Downside**: high memory usage (1B URLs may require ~100GB)

### Option 2: Bloom Filter

```java
BloomFilter<String> filter = BloomFilter.create(
    Funnels.stringFunnel(Charset.defaultCharset()),
    1_000_000_000,  // expected elements
    0.01            // false positive rate
);
```
**Pros**: small memory usage (~1.2GB), O(1) lookup
**Cons**: false positives (may skip some URLs)

### Option 3: Distributed dedup

Store visited URL hashes in Redis.

## Politeness

1. **Respect robots.txt**: check allow rules
2. **Rate limit**: 1-2s delay per host
3. **User-Agent**: identify the crawler
4. **Concurrency**: limit per-host parallelism

```python
# robots.txt example
User-agent: *
Disallow: /admin/
Crawl-delay: 2
```

## Fault tolerance

1. **Timeout & retry**: exponential backoff
2. **Dead link handling**: abandon after N failures
3. **Resume**: persist crawl state

# Summary

| Component | Choice |
|------|----------|
| Task queue | Kafka / Redis |
| URL dedup | Bloom Filter / Redis |
| Content storage | S3 / HDFS |
| Parser | Jsoup / BeautifulSoup |

Key challenges:
1. **Scale**: storing and deduplicating massive URLs
2. **Politeness**: avoid overloading target sites
3. **Robustness**: handle failures and malicious pages