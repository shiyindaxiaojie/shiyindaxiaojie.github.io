---
id: java-backend-java-example-2
title: 一次 Full GC 后接口抖动，你会看哪些 JVM 证据？
slug: java-backend-java-example-2
tracks:
  - java-backend
category: java
difficulty: senior
questionType: scenario
frequency: high
tags:
  - Java
  - JVM
  - GC Roots
  - 可达性分析
summary: 从 GC 日志、JVM 命令、堆 dump 和对象引用链定位 Full GC 与接口抖动的关系。
estimatedRead: 5
---

::interviewer::
线上接口突然抖了一下，时间点附近正好有 Full GC，你怎么判断它是不是根因？

::candidate level="deep"::
我会先把时间线对齐，而不是看到 Full GC 就下结论。第一步用接口监控看抖动窗口，比如 14:03:20 到 14:03:25；第二步看 GC 日志同一窗口有没有 STW，JDK 8 通常看 `-XX:+PrintGCDetails -XX:+PrintGCDateStamps` 输出，JDK 11+ 看 `-Xlog:gc*,safepoint:file=gc.log:time,uptime,tags`。如果多个接口在同一窗口一起抖，且 Full GC 停顿覆盖了这个窗口，GC 才更像根因。

::interviewer::
线上机器还在跑，你会先敲哪些命令？

::candidate::
我会先确认进程和 GC 概况：`jcmd -l` 找 PID，`jstat -gcutil <pid> 1000 10` 看 Eden、Old、Metaspace 和 YGC/FGC 变化，`jcmd <pid> GC.heap_info` 看堆布局。如果怀疑线程也被卡住，会补 `jcmd <pid> Thread.print -l` 或 `jstack -l <pid>`，确认是不是大家都停在 safepoint，还是只有某些线程在等锁、数据库或下游。

::interviewer::
GC 日志里你重点看什么？

::candidate::
我会看触发原因、停顿时间、回收前后堆占用，尤其是老年代 Full GC 后的水位。如果 Full GC 后 Old 从 90% 掉到 40%，可能是瞬时分配或批任务冲击；如果回收后还在 85% 以上，并且每次回收后基线越来越高，就要怀疑泄漏、缓存无界或队列积压。还会看有没有 promotion failed、allocation failure、metadata GC threshold 这类触发信号。

::interviewer::
如果怀疑内存泄漏，heap dump 里你怎么找？

::candidate level="deep"::
我会先尽量在风险可控的节点 dump，避免把线上实例打挂。可以先用 `jcmd <pid> GC.class_histogram | head` 看大对象趋势；确认要 dump 时用 `jcmd <pid> GC.heap_dump /tmp/app-$(date +%F-%H%M).hprof`，或者低版本用 `jmap -dump:live,format=b,file=/tmp/app.hprof <pid>`。拿到 dump 后用 MAT 或 JProfiler 看 Dominator Tree、Retained Size 和 Leak Suspects，再对可疑对象点 Path to GC Roots，重点排除 weak/soft reference 后看是谁强引用住它。

::interviewer::
如果 MAT 里看到某个 DTO 占用很大，你会直接说它泄漏吗？

::candidate::
不会。DTO 大只能说明它是结果，不说明它是根因。我会沿引用链看它被谁持有：可能是 `ConcurrentHashMap` 本地缓存没上限，可能是 `ThreadLocalMap`，可能是队列里的未消费任务，也可能是一次大查询还没处理完。只有当持有者不该长期持有，并且多次 dump 里 retained size 持续增长，才会判断为泄漏方向。

::interviewer::
定位到问题后，你怎么验证修复有效？

::candidate::
我会做修复前后对比：同样压测流量下看 `jstat -gcutil`、GC 日志、老年代回收后水位、接口 P99 和 Full GC 次数。泄漏类问题至少要跑到原来会增长的时间长度，确认 Old 回收后基线稳定。只看一次接口不抖不够，因为内存泄漏常常是慢变量。
