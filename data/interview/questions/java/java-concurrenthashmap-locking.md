---
id: java-concurrenthashmap-locking
title: ConcurrentHashMap 为什么能并发安全，又不是简单锁住整个 Map？
slug: java-concurrenthashmap-locking
tracks:
  - java-backend
category: concurrency
stage: technical
difficulty: senior
questionType: principle
frequency: high
tags:
  - Java
  - ConcurrentHashMap 并发容器
  - CAS 原子操作
  - 分段锁
  - 扩容协作
summary: 从 JDK 7 分段锁到 JDK 8 桶级锁和 CAS，理解并发写、读可见性、size 统计和扩容协作。
estimatedRead: 6
related:
  - java-hashmap-resize-collision
  - java-jmm-volatile-happens-before
---

::interviewer::
ConcurrentHashMap 和 Hashtable 都是线程安全的，为什么现在更常用 ConcurrentHashMap？

::candidate level="core"::
Hashtable 基本是整张表级别的同步，安全但并发度很低。ConcurrentHashMap 的思路是把锁粒度压小：读尽量不加锁，写只锁住必要位置。这样多个线程操作不同桶时可以并行，吞吐会比整表锁好很多。

::interviewer::
JDK 7 和 JDK 8 的 ConcurrentHashMap 有什么核心差异？

::candidate::
JDK 7 主要靠 Segment 分段锁，每个 Segment 像一个小 HashMap。JDK 8 去掉了 Segment，改成数组加链表或红黑树，空桶用 CAS 放节点，冲突桶用 synchronized 锁住桶头。这个变化让结构更接近 HashMap，也让锁粒度更自然地落到桶上。

::interviewer::
读操作为什么通常不用加锁？不会读到脏数据吗？

::candidate level="deep"::
这里的关键不是“完全不管并发”，而是用 volatile 和有序发布保证可见性。数组节点、节点 value、next 等字段的可见性设计让读线程能看到一个结构上可用的状态。它不保证你读到的是全局最新瞬间快照，但能保证不会像普通 HashMap 并发修改那样把结构读坏。

::interviewer::
如果两个线程同时 put 到同一个桶，会发生什么？

::candidate::
如果桶为空，会尝试 CAS 抢占这个桶，谁成功谁写入。如果桶不为空，就锁住桶头节点，在锁内遍历链表或树，决定覆盖还是追加。也就是说冲突集中到同一桶时，局部还是串行的；ConcurrentHashMap 提升的是不同桶之间的并发，不是让所有写入都无锁。

::interviewer::
ConcurrentHashMap 的 size 准不准？线上能不能依赖它做强一致判断？

::candidate::
size 是统计意义上的结果，不适合做强一致业务条件。并发写入时它会用 baseCount 和 CounterCell 分摊计数压力，结果可能刚算完就被其他线程改掉。如果业务要判断“库存是否还有”“是否超过上限”，我不会只靠 map.size，而会把判断放到数据库、锁或原子状态里。

::interviewer::
扩容时还有线程写入，它怎么处理？

::candidate::
扩容不是一个线程孤零零搬完整张表，其他线程遇到迁移状态时可以一起帮忙迁移。旧桶迁移后会放转发节点，读写线程看到后会去新表继续操作。这个设计避免扩容长时间阻塞所有线程，但扩容期间 CPU 会上升，所以如果容量能预估，还是应该提前设置。

::interviewer::
线上怀疑 ConcurrentHashMap 热点写导致延迟抖动，你怎么确认？

::candidate::
我会先抓线程栈：`jcmd <pid> Thread.print -l` 或 `jstack -l <pid>`，看是否大量线程卡在 `ConcurrentHashMap.compute`、`putVal` 或同一个业务缓存刷新方法。再用 Arthas `trace` 或 `watch` 看热点 key 的调用频次，必要时用 `profiler start -e wall` 看时间是不是耗在同步块或 mappingFunction 里。如果热点集中，优化方向通常是拆 key、提前预热、缩短 compute 里的逻辑，而不是换一个 Map。
