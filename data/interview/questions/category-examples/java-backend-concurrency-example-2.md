---
id: java-backend-concurrency-example-2
title: "高并发接口突然变慢，怎么判断是不是锁竞争？"
slug: java-backend-concurrency-example-2
tracks:
  - java-backend
category: concurrency
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Java 并发"
  - "线程池"
  - "锁竞争"
  - "背压"
summary: "围绕Java 并发的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
高并发接口突然变慢，怎么判断是不是锁竞争？

::candidate level="deep"::
先看线程池 active、queue、完成速率和请求分位数，再抓多份线程栈找大量 BLOCKED/WAITING 是否集中在同一监视器。JFR 或 async-profiler 的锁事件能量化等待；CPU 不高但线程大量阻塞才支持锁竞争判断。

::interviewer::
如果现场现象和预期不一致，Java 并发怎么继续缩小范围？

::candidate level="deep"::
把线程池指标、线程栈、JFR 锁事件、GC 和下游耗时对齐，压测时观察并发增加后吞吐是否停滞而延迟继续上升。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
扩大线程池可能把压力转给数据库连接池或远端服务。并发上限应由最窄下游决定，并保留超时、隔离和拒绝。
