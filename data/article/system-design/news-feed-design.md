---
title: News Feed System Design
date: 2023-08-25
description: Design a News Feed system similar to Weibo/Twitter.
tags:
  - System Design
  - Fan-out on Write
  - Fan-out on Read
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/news-feed.png
---

# Scenario

Design a News Feed system similar to Weibo/Twitter. Users can post updates, follow other users, and view a feed (timeline) of posts from people they follow.

Requirements:
1. Users can publish posts (text/images)
2. Users can follow/unfollow others
3. Users can view their Timeline (posts from followees)
4. Support 300M monthly active users (MAU) and 50M daily active users (DAU)

# Estimation

Assumptions:
- Each user follows 200 people on average
- 10% of users publish 1 post per day
- Average post size: 1KB

Write QPS:
- Daily posts: 50,000,000 × 10% = 5,000,000/day
- Write QPS: 5,000,000 / 86400 ≈ 58/s

Read QPS:
- Assume each user refreshes the timeline 10 times per day
- Read QPS: 50,000,000 × 10 / 86400 ≈ 5,787/s
- Peak read QPS: ~12,000/s

# Design

## Push vs. Pull models

### Push model (Fan-out on Write)

When a user publishes a post, fan it out to all followers’ timeline caches.

```
User publishes post → Write to post table → Asynchronously push to all followers’ Timeline
```

**Pros**: fast reads (serve directly from cache)
**Cons**: write amplification for celebrity users (1M followers = 1M writes)

### Pull model (Fan-out on Read)

When a user opens the timeline, fetch posts from followees on the fly and merge/sort.

```
User views Timeline → Get followee list → Fetch each followee’s posts → Merge and sort
```

**Pros**: simple writes (one write per post)
**Cons**: slower reads (need real-time aggregation)

### Hybrid model

- **Regular users**: push model (fan-out on write)
- **Celebrity users** (followers > 100k): pull model (fan-out on read)

## Overall architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Post API    │────▶│  Post DB     │────▶│  Fan-out     │
│              │     │  (MySQL)     │     │  Service     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Feed API    │◀────│  Timeline    │◀────│  Message     │
│              │     │  Cache       │     │  Queue       │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Data storage

### Post table
```sql
CREATE TABLE post (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    content TEXT,
    created_at TIMESTAMP,
    INDEX idx_user_created (user_id, created_at)
);
```

### Follow table
```sql
CREATE TABLE follow (
    follower_id BIGINT,
    followee_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);
```

### Timeline cache (Redis)
```
Key: timeline:{user_id}
Value: Sorted Set (score = timestamp, member = post_id)
```

## Key optimizations

1. **Cache warm-up**: pre-load the timeline on login
2. **Incremental updates**: push only new posts (avoid full refresh)
3. **Pagination**: cache only the latest 1000 items in the timeline
4. **Hot/cold split**: move historical posts to cold storage

# Summary

| Scenario | Recommended model |
|------|----------|
| Few followers | Push model |
| Celebrity (many followers) | Pull model |
| Production | Hybrid |

Key challenges:
1. **Hotspots**: write amplification for celebrity users
2. **Real-time**: latency from posting to being visible to followers
3. **Consistency**: keeping cache and database consistent