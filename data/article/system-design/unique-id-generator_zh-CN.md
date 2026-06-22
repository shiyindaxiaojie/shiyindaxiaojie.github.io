---
title: 唯一ID生成器设计
date: 2023-08-25
description: 设计一个分布式唯一 ID 生成器，为分布式系统提供全局唯一的 ID。
tags:
  - 系统设计
  - 雪花算法
  - 发号器
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/uid-generator.png
---

# 场景

设计一个分布式唯一 ID 生成器，为分布式系统提供全局唯一的 ID。

需求点：
1. ID 必须全局唯一
2. ID 只包含数字
3. ID 按时间趋势递增
4. 64 位长度
5. 支持每秒生成 10000 个 ID

# 估算

- QPS：10000 次/秒
- 峰值 QPS：20000 次/秒
- 每个 ID 8 字节，每秒产生 80KB 数据

# 设计

## 方案对比

### 1. UUID

```
550e8400-e29b-41d4-a716-446655440000
```

**优点**：简单，无需中心化服务
**缺点**：
- 128 位太长，存储空间大
- 无序，作为主键性能差
- 包含字母，不满足纯数字要求

### 2. 数据库自增

```sql
CREATE TABLE id_generator (
    id BIGINT AUTO_INCREMENT PRIMARY KEY
);
```

**优点**：简单，有序递增
**缺点**：
- 单点故障
- 性能瓶颈
- 分库分表后难以保证唯一

### 3. 数据库号段模式

每次从数据库获取一段 ID（如 1000 个），本地缓存使用。

```sql
CREATE TABLE id_segment (
    biz_tag VARCHAR(64) PRIMARY KEY,
    max_id BIGINT,
    step INT,
    updated_at TIMESTAMP
);
```

**优点**：减少数据库访问，性能高
**缺点**：服务重启会浪费部分 ID

### 4. 雪花算法（Snowflake）⭐ 推荐

```
┌─────────┬──────────────┬────────────┬──────────────┐
│ 符号位  │   时间戳      │  机器ID    │   序列号     │
│  1bit   │   41bit      │   10bit    │    12bit     │
└─────────┴──────────────┴────────────┴──────────────┘
```

- **符号位**：固定为 0，保证 ID 为正数
- **时间戳**：41 位，可用 69 年
- **机器ID**：10 位，支持 1024 个节点
- **序列号**：12 位，每毫秒可生成 4096 个 ID

**优点**：
- 本地生成，无需网络调用
- 趋势递增
- 高性能，单机每秒可生成 400 万个 ID

**缺点**：
- 依赖机器时钟，时钟回拨会导致 ID 重复

## 雪花算法实现

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

## 时钟回拨处理

1. **抛出异常**：简单粗暴，让业务重试
2. **等待追上**：如果回拨时间短（<5ms），等待时钟追上
3. **备用机器ID**：切换到备用机器 ID 继续生成

# 总结

| 方案 | 性能 | 有序性 | 可用性 | 推荐场景 |
|------|------|--------|--------|----------|
| UUID | 高 | 无序 | 高 | 不要求有序的场景 |
| 数据库自增 | 低 | 有序 | 低 | 单机小规模 |
| 号段模式 | 中 | 有序 | 中 | 中等规模 |
| 雪花算法 | 高 | 趋势递增 | 高 | 大规模分布式 |

开源实现：
- **美团 Leaf**：支持号段模式和雪花算法
- **百度 UidGenerator**：增强版雪花算法
- **滴滴 TinyID**：号段模式