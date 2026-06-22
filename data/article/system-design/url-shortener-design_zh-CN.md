---
title: URL 短链系统设计
date: 2023-08-25
description: 设计一个 URL 短链服务，类似 bit.ly、tinyurl.com。
tags:
  - 系统设计
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/short-url.png
---

# 场景

设计一个 URL 短链服务，类似 bit.ly、tinyurl.com。

需求点：
1. 给定长 URL，生成短链接
2. 访问短链接，重定向到原始 URL
3. 短链接长度尽量短（7 位字符）
4. 支持自定义短链接
5. 日活用户 1 亿，每天生成 1 亿条短链接

# 估算

写入：
- 日生成量：1 亿条/天
- 写入 QPS：100,000,000 / 86400 ≈ 1157 次/秒

读取（假设读写比 10:1）：
- 读取 QPS：11570 次/秒
- 峰值 QPS：约 23000 次/秒

存储：
- 每条记录约 500 字节（短链 + 长链 + 元数据）
- 日存储量：1 亿 × 500B = 50GB/天
- 5 年存储：50GB × 365 × 5 ≈ 91TB

短链长度计算：
- 使用 [0-9a-zA-Z] 共 62 个字符
- 7 位短链：62^7 ≈ 3.5 万亿，足够使用

# 设计

## 整体架构

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

## 短链生成方案

### 方案一：哈希 + 冲突处理

```
长URL → MD5/SHA256 → 取前7位 → 检查冲突 → 存储
```

**冲突处理**：如果短链已存在，追加随机字符重新生成

**缺点**：需要查库检查冲突，性能较差

### 方案二：自增 ID + Base62 编码 ⭐ 推荐

```
长URL → 生成唯一ID → Base62编码 → 短链
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

**优点**：无冲突，性能高

## 数据存储

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

## 重定向方式

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 301 | 永久重定向，浏览器缓存 | 不需要统计点击 |
| 302 | 临时重定向，每次请求服务器 | 需要统计点击数据 |

推荐使用 **302**，便于统计分析。

## 缓存策略

```
读取流程：
1. 查询 Redis 缓存
2. 缓存命中 → 直接返回
3. 缓存未命中 → 查询数据库 → 写入缓存 → 返回
```

热点数据缓存，设置合理的 TTL（如 24 小时）。

## 高可用设计

1. **数据库主从复制**：读写分离
2. **多机房部署**：异地多活
3. **限流降级**：防止恶意请求

# 总结

| 组件 | 技术选型 |
|------|----------|
| ID 生成 | 雪花算法 / 号段模式 |
| 缓存 | Redis Cluster |
| 存储 | MySQL + 分库分表 |
| 编码 | Base62 |

核心挑战：
1. **短链唯一性**：避免冲突
2. **高并发读取**：缓存 + CDN
3. **海量存储**：分库分表 + 冷热分离