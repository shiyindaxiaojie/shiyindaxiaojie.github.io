---
title: URL Shortener System Design
date: 2023-08-25
description: Design a URL shortening service similar to bit.ly or tinyurl.com.
tags:
  - System Design
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/short-url.png
---

# Scenario

Design a URL shortening service similar to bit.ly or tinyurl.com.

Requirements:
1. Given a long URL, generate a short URL
2. Visiting the short URL redirects to the original URL
3. Keep the short URL as short as possible (7 characters)
4. Support custom aliases
5. 100M DAU and 100M new short URLs per day

# Estimation

Writes:
- Daily creation: 100,000,000/day
- Write QPS: 100,000,000 / 86400 ≈ 1,157/s

Reads (assume read/write = 10:1):
- Read QPS: 11,570/s
- Peak QPS: ~23,000/s

Storage:
- Each record ~500 bytes (short URL + long URL + metadata)
- Daily storage: 100M × 500B = 50GB/day
- 5-year storage: 50GB × 365 × 5 ≈ 91TB

Short URL space:
- Alphabet: [0-9a-zA-Z] => 62 characters
- 7 chars: 62^7 ≈ 3.5 trillion, enough for the scale

# Design

## Overall architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API GW    │────▶│  Short URL  │
│             │     │   + LB      │     │   Service   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
             ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
             │   Redis     │           │   MySQL     │           │    ID       │
             │   Cache     │           │   Storage   │           │  Generator  │
             └─────────────┘           └─────────────┘           └─────────────┘
```

## Short URL generation

### Option 1: Hashing + collision handling

```
Long URL → MD5/SHA256 → Take first 7 chars → Check collision → Store
```

**Collision handling**: if the short code already exists, append randomness and retry

**Downside**: requires a DB check for collisions; worse performance

### Option 2: Auto-increment ID + Base62 ⭐ Recommended

```
Long URL → Generate unique ID → Base62 encode → Short URL
```

```java
public String encode(long id) {
    String chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    StringBuilder sb = new StringBuilder();
    while (id > 0) {
        sb.append(chars.charAt((int)(id % 62)));
        id /= 62;
    }
    return sb.reverse().toString();
}
```

**Pros**: collision-free, high performance

## Data storage

```sql
CREATE TABLE url_mapping (
    id BIGINT PRIMARY KEY,
    short_url VARCHAR(10) UNIQUE,
    long_url VARCHAR(2048),
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_short_url (short_url)
);
```

## Redirect strategy

| Status code | Description | Use case |
|--------|------|------|
| 301 | Permanent redirect (cached by browser) | No click analytics needed |
| 302 | Temporary redirect (hits server each time) | Need click analytics |

Recommend **302** when analytics is needed.

## Cache strategy

```
Read flow:
1. Query Redis
2. Cache hit -> return
3. Cache miss -> query DB -> write cache -> return
```

Cache hot data with a reasonable TTL (e.g., 24 hours).

## High availability

1. **DB replication**: read/write split
2. **Multi-region deployment**: active-active
3. **Rate limiting & degradation**: protect against abuse

# Summary

| Component | Choice |
|------|----------|
| ID generation | Snowflake / segment allocation |
| Cache | Redis Cluster |
| Storage | MySQL + sharding |
| Encoding | Base62 |

Key challenges:
1. **Uniqueness**: avoid collisions
2. **High read concurrency**: cache + CDN
3. **Massive storage**: sharding + hot/cold separation