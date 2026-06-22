---
title: Unique ID Generator Design
date: 2023-08-25
description: Open-source implementations Key points include Meituan Leaf, Baidu UidGenerator, Didi TinyID.
tags:
  - System Design
  - Snowflake
  - ID Generator
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/uid-generator.png
---

# Scenario

Design a distributed unique ID generator to provide globally unique IDs for distributed systems.

Requirements:
1. IDs must be globally unique
2. IDs contain digits only
3. IDs increase roughly with time
4. 64-bit length
5. Support generating 10,000 IDs per second

# Estimation

- QPS: 10,000/s
- Peak QPS: 20,000/s
- Each ID is 8 bytes => ~80KB/s

# Design

## Option comparison

### 1. UUID

```
550e8400-e29b-41d4-a716-446655440000
```

**Pros**: simple, no centralized service
**Cons**:
- 128-bit is long (more storage)
- Not ordered (poor performance as primary key)
- Contains letters (does not meet digits-only requirement)

### 2. Database auto-increment

```sql
CREATE TABLE id_generator (
    id BIGINT AUTO_INCREMENT PRIMARY KEY
);
```

**Pros**: simple, ordered
**Cons**:
- Single point of failure
- Performance bottleneck
- Hard to guarantee uniqueness with sharding

### 3. Database segment allocation

Allocate a segment of IDs (e.g., 1000) from the database and cache locally.

```sql
CREATE TABLE id_segment (
    biz_tag VARCHAR(64) PRIMARY KEY,
    max_id BIGINT,
    step INT,
    updated_at TIMESTAMP
);
```

**Pros**: fewer DB calls, good performance
**Cons**: restarting services may waste some IDs

### 4. Snowflake ⭐ Recommended

```
┌─────────┬──────────────┬────────────┬──────────────┐
│ Sign bit │ Timestamp    │ Worker ID  │ Sequence     │
│  1bit   │   41bit      │   10bit    │    12bit     │
└─────────┴──────────────┴────────────┴──────────────┘
```

- **Sign bit**: fixed to 0 to ensure a positive number
- **Timestamp**: 41 bits (~69 years)
- **Worker ID**: 10 bits (up to 1024 nodes)
- **Sequence**: 12 bits (up to 4096 IDs per millisecond)

**Pros**:
- Generated locally (no network call)
- Roughly increasing
- High performance (millions per second on a single node)

**Cons**:
- Relies on the system clock; clock rollback may cause duplicates

## Snowflake implementation

```java
public class SnowflakeIdGenerator {
    private final long epoch = 1609459200000L; // 2021-01-01
    private final long workerIdBits = 10L;
    private final long sequenceBits = 12L;
    
    private final long maxWorkerId = ~(-1L << workerIdBits);
    private final long sequenceMask = ~(-1L << sequenceBits);
    
    private final long workerIdShift = sequenceBits;
    private final long timestampShift = sequenceBits + workerIdBits;
    
    private long workerId;
    private long sequence = 0L;
    private long lastTimestamp = -1L;
    
    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis();
        
        if (timestamp < lastTimestamp) {
            throw new RuntimeException("Clock moved backwards");
        }
        
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & sequenceMask;
            if (sequence == 0) {
                timestamp = waitNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }
        
        lastTimestamp = timestamp;
        
        return ((timestamp - epoch) << timestampShift)
             | (workerId << workerIdShift)
             | sequence;
    }
}
```

## Handling clock rollback

1. **Throw an exception**: simplest approach; let clients retry
2. **Wait until caught up**: for small rollbacks (<5ms), block until time catches up
3. **Fallback worker ID**: switch to a backup worker ID

# Summary

| Option | Performance | Order | Availability | Recommended use |
|------|------|--------|--------|----------|
| UUID | High | Unordered | High | When order is not required |
| Auto-increment DB | Low | Ordered | Low | Small single-instance systems |
| Segment allocation | Medium | Ordered | Medium | Medium scale |
| Snowflake | High | Roughly ordered | High | Large-scale distributed systems |

Open-source implementations:
- **Meituan Leaf**: segment + Snowflake
- **Baidu UidGenerator**: enhanced Snowflake
- **Didi TinyID**: segment allocation