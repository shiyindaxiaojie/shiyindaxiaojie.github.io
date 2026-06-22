---
title: News Feed 系统设计
date: 2023-08-25
description: 设计一个类似微博、Twitter 的 News Feed 系统，用户可以发布动态，关注其他用户，并查看关注用户的动态流。
tags:
  - 系统设计
  - 写广播
  - 读广播
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/news-feed.png
---

# 场景

设计一个类似微博、Twitter 的 News Feed 系统，用户可以发布动态，关注其他用户，并查看关注用户的动态流。

需求点：
1. 用户可以发布动态（文字、图片）
2. 用户可以关注/取关其他用户
3. 用户可以查看自己的 Timeline（关注用户的动态流）
4. 支持 3 亿月活用户，5000 万日活用户

# 估算

假设：
- 平均每个用户关注 200 人
- 10% 的用户每天发布 1 条动态
- 每条动态平均 1KB

写入 QPS：
- 日发布量：50,000,000 × 10% = 500 万条/天
- 写入 QPS：5,000,000 / 86400 ≈ 58 次/秒

读取 QPS：
- 假设每个用户每天刷 10 次 Timeline
- 读取 QPS：50,000,000 × 10 / 86400 ≈ 5787 次/秒
- 峰值读取 QPS：约 12000 次/秒

# 设计

## 两种模式对比

### 推模式（写扩散 / Fan-out on Write）

发布动态时，将动态推送到所有粉丝的 Timeline 缓存中。

```
用户发布动态 → 写入动态表 → 异步推送到所有粉丝的 Timeline
```

**优点**：读取 Timeline 速度快，直接从缓存读取
**缺点**：大V发布动态时写入压力大（百万粉丝 = 百万次写入）

### 拉模式（读扩散 / Fan-out on Read）

用户查看 Timeline 时，实时拉取关注用户的动态并合并排序。

```
用户查看 Timeline → 获取关注列表 → 拉取每个关注用户的动态 → 合并排序
```

**优点**：写入简单，发布动态只需写一次
**缺点**：读取慢，需要实时聚合多个用户的动态

### 推拉结合（混合模式）

- **普通用户**：使用推模式，发布动态时推送到粉丝 Timeline
- **大V用户**（粉丝 > 10万）：使用拉模式，读取时实时拉取

## 整体架构

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

## 数据存储

### 动态表（Post）
```sql
CREATE TABLE post (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    content TEXT,
    created_at TIMESTAMP,
    INDEX idx_user_created (user_id, created_at)
);
```

### 关注关系表（Follow）
```sql
CREATE TABLE follow (
    follower_id BIGINT,
    followee_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);
```

### Timeline 缓存（Redis）
```
Key: timeline:{user_id}
Value: Sorted Set (score = timestamp, member = post_id)
```

## 关键优化

1. **缓存预热**：用户登录时预加载 Timeline
2. **增量更新**：只推送新动态，不全量刷新
3. **分页加载**：Timeline 只缓存最近 1000 条
4. **冷热分离**：历史动态存储到冷存储

# 总结

| 场景 | 推荐模式 |
|------|----------|
| 粉丝数少 | 推模式 |
| 大V（粉丝多） | 拉模式 |
| 生产环境 | 推拉结合 |

核心挑战：
1. **热点问题**：大V发布动态的写入放大
2. **实时性**：动态发布到粉丝可见的延迟
3. **一致性**：缓存与数据库的数据一致性