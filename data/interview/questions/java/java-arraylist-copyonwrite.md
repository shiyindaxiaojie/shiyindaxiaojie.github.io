---
id: java-arraylist-copyonwrite
title: ArrayList、LinkedList 和 CopyOnWriteArrayList 到底怎么选？
slug: java-arraylist-copyonwrite
tracks:
  - java-backend
category: java
stage: technical
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - Java
  - ArrayList 扩容
  - LinkedList 指针
  - CopyOnWrite 读写分离
  - 迭代安全
summary: 用访问模式、写入成本、内存局部性和并发读写语义判断 List 的选型边界。
estimatedRead: 5
related:
  - java-hashmap-resize-collision
  - java-concurrenthashmap-locking
---

::interviewer::
ArrayList 和 LinkedList 你平时怎么选？不要只说一个查得快一个插得快。

::candidate level="core"::
我会先看访问模式。多数业务里是按下标读、遍历、末尾追加，这时 ArrayList 更合适，因为数组连续，CPU 缓存友好，常数成本低。LinkedList 只有在明确拿着节点位置做大量插入删除时才有优势，但 Java 的 LinkedList 还要承担对象和指针开销，实际并不常赢。

::interviewer::
ArrayList 扩容会带来什么问题？

::candidate::
扩容会创建更大的数组，再把旧数组复制过去。单次看是 O(n)，平摊后追加仍然可以接受，但如果热路径里频繁从小容量开始增长，就会有内存拷贝和短时延迟。能预估大小时我会给初始容量，尤其是批量导入、分页聚合这类场景。

::interviewer::
遍历 ArrayList 时另一个线程修改，会发生什么？

::candidate level="deep"::
普通 ArrayList 不是线程安全的，迭代器还会做 fail-fast 检查，发现结构性修改可能抛 ConcurrentModificationException。但这个异常只是尽早暴露问题，不是并发安全机制。真有并发读写，要么外部加锁，要么换并发容器，要么让数据变成不可变快照。

::interviewer::
CopyOnWriteArrayList 适合什么场景？

::candidate::
它适合读远多于写，而且读希望无锁稳定的场景，比如监听器列表、配置快照、路由规则快照。写入时复制整个数组，再替换引用，所以读很舒服，写很贵。它不是“线程安全 ArrayList 的万能替代品”，写频繁或列表很大时会制造大量复制和内存压力。

::interviewer::
CopyOnWriteArrayList 的迭代为什么不会被并发修改影响？

::candidate::
因为迭代器拿到的是创建时的数组快照。后续写入会复制新数组，不会改旧数组，所以当前遍历看到的是旧视图。这带来一个边界：读到的数据可能不是最新的，但它是一致的。能接受短暂旧数据，才适合用它。

::interviewer::
如果一个接口每次请求都要维护一个临时 List，你会怎么处理？

::candidate::
如果 List 只在请求线程内部使用，就用普通 ArrayList，不需要并发容器。并发容器解决的是共享可变状态，不是所有集合问题。很多性能问题是把局部变量过度设计成线程安全结构，增加了锁、复制或内存开销，却没有带来实际安全收益。

::interviewer::
如果线上怀疑 CopyOnWriteArrayList 写太频繁导致内存和延迟问题，你怎么验证？

::candidate::
我会先看写入频率和数组复制成本。代码层面查 add/remove 调用路径；运行时可以用 `jcmd <pid> GC.class_histogram | grep CopyOnWriteArrayList` 粗看对象数量，再用 heap dump 看是否有大量旧数组被短期保留。压测里对比写频率升高时的 GC 次数、分配速率和 P99。如果写很多，CopyOnWrite 的问题会表现为分配量和 GC 压力上升，而不是单纯 CPU 高。
