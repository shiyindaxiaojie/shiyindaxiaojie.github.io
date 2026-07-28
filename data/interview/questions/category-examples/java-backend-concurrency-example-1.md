---
id: java-backend-concurrency-example-1
title: "Java 线程池参数怎么配，为什么队列不能无限大？"
slug: java-backend-concurrency-example-1
tracks:
  - java-backend
category: concurrency
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Java 并发"
  - "线程池"
  - "锁竞争"
  - "背压"
summary: "围绕Java 并发的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Java 线程池参数怎么配，为什么队列不能无限大？

::candidate level="core"::
先区分 CPU 密集和等待型任务，再用到达率、任务耗时、目标延迟和下游容量估算并发。队列只吸收短暂突发，无界队列会把过载变成长时间排队和内存压力；拒绝策略必须和降级或回压相连。

::interviewer::
别停在原理上，Java 并发落到线上先看什么证据？

::candidate level="deep"::
把线程池指标、线程栈、JFR 锁事件、GC 和下游耗时对齐，压测时观察并发增加后吞吐是否停滞而延迟继续上升。

::interviewer::
Java 并发这套判断在哪个边界下会失效？

::candidate::
扩大线程池可能把压力转给数据库连接池或远端服务。并发上限应由最窄下游决定，并保留超时、隔离和拒绝。
