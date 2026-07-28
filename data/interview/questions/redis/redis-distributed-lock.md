---
id: redis-distributed-lock
title: Redis 分布式锁为什么不能只用 setnx？
slug: redis-distributed-lock
tracks:
  - java-backend
  - go-backend
  - python-engineer
category: redis
stage: technical
difficulty: intermediate
questionType: principle
frequency: high
tags:
  - 分布式锁
  - Lua 原子释放
  - 锁续期
  - 并发控制
summary: 高低频面试都会问，但真正区分层次的是你能不能把锁安全性讲完整。
estimatedRead: 6
related:
  - redis-cache-breakdown
  - mysql-mvcc
---

::interviewer::
Redis 分布式锁为什么不能只用 `setnx`？

::candidate level="core"::
因为它只解决了“抢锁”这一步，没有解决锁自动过期、原子设置过期时间、以及误删别人锁的问题。

::interviewer::
你别只给结论，展开一下。

::candidate::
最容易漏掉三个坑：

1. 只 `setnx` 不设过期，持锁线程挂掉后会留下死锁。
2. 先 `setnx` 再 `expire` 不是原子操作，中间失败仍然会留下死锁。
3. 即使加了过期时间，业务执行超时后，旧线程可能把新线程的锁删掉。

::candidate level="deep"::
标准做法通常是 `SET key value NX EX seconds`。  
`value` 必须是请求唯一标识，删除锁时要先校验 value，再通过 Lua 保证“比对 + 删除”原子执行。

::note::
面试官真正想听到的是：你知道 `setnx` 只是入口，真正的难点在原子性、续约和锁归属。

::related::
- redis-cache-breakdown
- mysql-mvcc
