---
id: java-backend-concurrency-example-2
title: 高并发接口突然变慢，怎么判断是不是锁竞争？
slug: java-backend-concurrency-example-2
tracks:
  - java-backend
category: concurrency
difficulty: senior
questionType: scenario
frequency: high
tags:
  - 并发编程
  - 线程池
  - AQS
  - 锁竞争
summary: 用线程 dump、Arthas、锁等待和临界区拆解高并发接口的锁竞争问题。
estimatedRead: 5
---

::interviewer::
一个高并发接口 P99 突然升高，你怀疑有锁竞争，会怎么验证？

::candidate level="deep"::
我会先抓证据。第一步 `jcmd <pid> Thread.print -l > /tmp/thread.txt` 或 `jstack -l <pid>`，连续抓 3 次，每次间隔几秒，看是不是大量业务线程卡在同一把 monitor、同一个 `ReentrantLock` 或同一段方法。第二步用 Arthas `thread -b` 找阻塞其他线程最多的线程，再用 `thread <id>` 看它正在锁内做什么。

::interviewer::
如果线程 dump 里看到很多 BLOCKED，就一定是锁问题吗？

::candidate::
大概率是锁竞争方向，但还要看锁内在做什么。如果持锁线程在执行本地计算，可能是临界区太大；如果它在 JDBC、Redis、HTTP 调用里，说明把慢 IO 放进锁里了；如果大家都在等同一个缓存刷新锁，可能是热点 key 或缓存击穿。只看 BLOCKED 不够，要把持锁线程的栈读出来。

::interviewer::
你会怎么优化？

::candidate level="deep"::
先缩短临界区，把远程调用、日志大对象拼接、序列化这些操作移出锁。然后看能不能拆锁，比如按 userId、skuId 做分段锁，或者把全局 Map 改成 `ConcurrentHashMap.computeIfAbsent` 这类局部原子操作。读多写少可以考虑不可变快照或读写锁，但要用压测验证，不是看到读多就上读写锁。

::interviewer::
怎么证明优化真的减少了锁等待？

::candidate::
修复前后我会对比 P99、吞吐、线程 BLOCKED 数量、锁等待时间和 CPU。压测时可以用 Arthas `profiler start -e wall` 看耗时卡在哪里，再 `profiler stop --format html` 看锁等待或慢调用是否下降。只看接口平均耗时不够，锁竞争主要伤的是尾延迟。

::interviewer::
如果锁竞争只在大促热点商品上出现，你会怎么提前发现？

::candidate::
压测不能只打均匀流量，要打热点模型，比如 80% 请求集中到 1% sku。观察同一个 key 上的锁等待、队列长度、缓存刷新次数和下游调用次数。如果热点把请求打成串行，要提前做热点隔离、预热、异步刷新或降级，而不是等线上线程 dump 才发现。
