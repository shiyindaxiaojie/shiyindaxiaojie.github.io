---
id: jvm-memory-oom-leak-troubleshooting
title: Java 进程内存飙升时，怎么判断是泄漏还是正常抖动？
slug: jvm-memory-oom-leak-troubleshooting
tracks:
  - java-backend
category: java
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - JVM
  - OOM 排查
  - 堆内存
  - GC 日志
  - MAT 排查
summary: 从堆、非堆、直接内存、线程栈、GC 日志和 dump 分析定位内存增长原因。
estimatedRead: 7
related:
  - jvm-gc-cms-g1-selection
  - java-threadlocal-context-leak
---

::interviewer::
线上 Java 进程内存一直涨，你第一步看什么？

::candidate level="core"::
我会先确认涨的是 JVM 堆，还是进程 RSS。先用 `top -p <pid>` 或容器监控看进程 RSS，再用 `jcmd <pid> GC.heap_info`、`jstat -gcutil <pid> 1000 10` 看堆和 GC 情况。如果 RSS 涨但堆不涨，就要转向直接内存、线程栈、JNI、mmap；如果 Old 区持续涨，才重点看 heap dump。先分区，后面才不会拿 heap dump 去查堆外问题。

::interviewer::
怎么判断是内存泄漏，不是正常业务高峰？

::candidate::
我会看 Full GC 后的老年代水位，而不是只看某一刻内存高。具体会用 `jstat -gcutil <pid> 1000 60` 连续看 O 区变化，再对齐 GC 日志。如果每次 Full GC 后 O 区基线都降不下来，并且趋势持续上升，就更像泄漏或长期持有；如果高峰后能回落，可能是流量或批任务造成的正常抖动。

::interviewer::
拿到 heap dump 后，你会怎么分析？

::candidate level="deep"::
我会先安全地拿 dump：优先摘掉一台实例或在低峰执行 `jcmd <pid> GC.heap_dump /tmp/app.hprof`；老版本可以用 `jmap -dump:live,format=b,file=/tmp/app.hprof <pid>`，但要知道 live dump 会触发 Full GC。分析时用 MAT 打开，看 Dominator Tree 和 Retained Size，再对可疑对象看 Path to GC Roots。重点不是“哪个类最大”，而是“谁把它强引用住”。常见根因是本地缓存、`ThreadLocalMap`、静态集合、阻塞队列、未完成的 Future 或消息积压。

::interviewer::
如果 OOM 是 Direct buffer memory，你会怎么查？

::candidate::
这就不能只盯堆。我会先查 JVM 参数：`jcmd <pid> VM.flags | grep -i Direct` 看 `MaxDirectMemorySize`，再看 Netty allocator 指标或日志里有没有 leak detector 告警。堆 dump 里通常只能看到 `DirectByteBuffer` 包装对象，真正内存在堆外，所以还要结合 RSS、直接内存指标和 ByteBuf release 情况。Netty 场景我会打开资源泄漏检测做灰度验证，而不是只靠 MAT。

::interviewer::
频繁 Full GC 时，你会马上加内存吗？

::candidate::
不会直接加。加内存可能只是把问题推迟，还可能让单次 GC 停顿更长。我会先用 GC 日志和 `jstat` 看晋升速率、Full GC 触发原因、回收后水位，再用 histogram 或 dump 看对象来源。如果是容量不足，加内存合理；如果是泄漏、缓存无界、批量查询过大，加内存只是在掩盖问题。

::interviewer::
你会怎么把这类问题预防在上线前？

::candidate::
我会给缓存设置容量和过期策略，批量接口限制单次数据量，异步队列设置上限，压测时观察 GC 后基线是否稳定。关键链路还要有堆、非堆、直接内存、线程数和 GC 暂停时间监控。内存问题通常不是某一行代码突然坏了，而是边界没设清楚。
