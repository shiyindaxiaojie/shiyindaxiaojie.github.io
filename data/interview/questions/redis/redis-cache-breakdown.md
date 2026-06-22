---
id: redis-cache-breakdown
title: Redis 缓存击穿怎么处理，为什么不是随便加个锁就行？
slug: redis-cache-breakdown
tracks:
  - java-backend
  - go-backend
  - python-engineer
category: redis
difficulty: intermediate
questionType: scenario
frequency: high
tags:
  - 缓存击穿
  - 热点 Key
  - 单飞回源
  - 降级兜底
summary: 核心不是背方案列表，而是说明热点 key 场景下如何保护数据库。
estimatedRead: 5
related:
  - redis-distributed-lock
---

::interviewer::
如果一个热点 key 失效了，瞬间很多请求一起打到数据库，怎么处理？

::candidate level="core"::
这是缓存击穿。我的第一反应是做单飞控制，只允许一个请求去回源，其他请求等待结果或降级。

::interviewer::
为什么你不直接说“加锁”就完了？

::candidate::
因为锁只是手段，不是答案。要先看业务能不能接受短暂旧值、能不能异步重建、是不是单机热点还是分布式热点。  
如果所有请求都死等锁，锁竞争本身也可能成为新的放大器。

::candidate level="deep"::
工程上通常会组合使用：

1. 热点 key 永不过期，后台异步刷新。
2. 回源单飞，限制同时回源的请求数。
3. 熔断和默认值兜底，避免数据库被打穿。
4. 对热点 key 单独监控命中率和回源耗时。

::note::
这题的加分项是你能把“锁、异步刷新、兜底、监控”放在同一套链路里讲。
