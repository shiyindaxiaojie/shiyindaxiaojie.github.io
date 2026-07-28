---
id: jvm-gc-cms-g1-selection
title: CMS 和 G1 怎么选，GC 停顿问题怎么排查？
slug: jvm-gc-cms-g1-selection
tracks:
  - java-backend
category: java
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - JVM
  - GC 日志
  - CMS 收集器
  - G1 收集器
  - STW 停顿
summary: 从回收目标、堆布局、停顿来源、晋升失败和日志指标判断 GC 调优方向。
estimatedRead: 6
related:
  - jvm-memory-oom-leak-troubleshooting
  - jvm-gc-roots
---

::interviewer::
GC 调优时，你先看收集器参数，还是先看业务现象？

::candidate level="core"::
我会先看业务现象和 GC 日志。JDK 11+ 我会确认是否有 `-Xlog:gc*,safepoint:file=gc.log:time,uptime,tags`，JDK 8 看 `-XX:+PrintGCDetails -XX:+PrintGCDateStamps`。线上再用 `jstat -gcutil <pid> 1000 30` 看 YGC/FGC、Old、Meta 的变化。先证明瓶颈是 GC，再谈参数。

::interviewer::
CMS 的特点是什么？为什么后来很多服务迁到 G1？

::candidate::
CMS 目标是降低老年代回收停顿，标记和清理阶段大部分能和应用线程并发执行。但它有碎片问题，也可能出现 concurrent mode failure，最后退化成更重的停顿。G1 把堆拆成 Region，可以按收益选择回收区域，更容易给停顿目标做预算，所以大堆场景下更常见。

::interviewer::
G1 设置了 MaxGCPauseMillis，就一定能把停顿控制住吗？

::candidate level="deep"::
不能。这个参数是目标，不是硬保证。G1 会根据目标选择回收多少 Region，但如果对象晋升太快、Remembered Set 维护压力大、Humongous 对象多，或者机器 CPU 不够，停顿仍然会超。它能做的是尽量接近目标，不是违反物理成本。

::interviewer::
你看 GC 日志时最关注哪些信息？

::candidate::
我会看 GC 类型、触发原因、停顿时间、回收前后各代占用、晋升量、Full GC 次数，以及回收后老年代基线是否上升。实操上会把 GC 日志和接口 P99 时间戳对齐；如果有 `to-space exhausted`、`humongous allocation`、`metadata GC threshold`、`System.gc()` 这类原因，排查方向完全不同。

::interviewer::
如果接口偶发卡 2 秒，你怎么判断是不是 GC？

::candidate::
我会把接口耗时、GC 停顿时间和时间戳对齐。如果卡顿窗口正好有 safepoint 或 Full GC，而且多个接口同时抖，就很可能是 GC。可以用 GC 日志、APM trace、网关 access log 三个时间线交叉验证。如果只有某个接口慢，线程 dump 里又看到它卡在锁或 JDBC，那就不能把锅甩给 GC。

::interviewer::
调 GC 和改代码之间，你怎么取舍？

::candidate::
如果是参数不合理，比如堆太小、年轻代比例明显不合适，可以调参数。但我会先用 `jcmd <pid> GC.class_histogram`、heap dump 或 JFR 看对象从哪里来。很多 GC 问题根因在代码：一次查太多数据、缓存无上限、大对象频繁创建、序列化临时对象太多。能减少分配先减少分配，参数调优放在理解对象生命周期之后。
