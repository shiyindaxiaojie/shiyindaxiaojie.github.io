---
id: java-backend-java-example-2
title: "Java 进程内存持续涨，怎么区分堆泄漏、堆外占用和正常缓存？"
slug: java-backend-java-example-2
tracks:
  - java-backend
category: java
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Java"
  - "Full GC 停顿"
  - "内存泄漏"
  - "JVM 诊断"
summary: "围绕Java的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Java 进程内存持续涨，怎么区分堆泄漏、堆外占用和正常缓存？

::candidate level="deep"::
先对齐进程 RSS、JVM heap、Metaspace、direct buffer 和线程栈。堆回收后仍持续抬升再做 heap dump 看支配树；RSS 涨而堆稳定，则查 NMT、直接内存、mmap 与线程数量。缓存要验证容量上限和淘汰是否生效。

::interviewer::
如果现场现象和预期不一致，Java怎么继续缩小范围？

::candidate level="deep"::
保留 GC 日志、jstat/jcmd、线程栈、heap dump 或 NMT 快照，并将采样时间与流量、发布和容器内存指标对齐。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
线上 dump 会带来停顿和磁盘压力，必须先确认空间与影响。容器 OOM 还要看 cgroup 限制，JVM 视角并不包含全部进程内存。
