---
id: go-backend-go-example-2
title: "slice 和 map 最容易踩哪些并发与内存坑？"
slug: go-backend-go-example-2
tracks:
  - go-backend
category: go
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Go"
  - "GMP 调度"
  - "slice 内存"
  - "map 并发"
summary: "围绕Go的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
slice 和 map 最容易踩哪些并发与内存坑？

::candidate level="deep"::
slice 扩容可能换底层数组，函数间共享后 append 会产生意外别名；截取小片段还可能保留大数组。map 并发读写不安全，迭代顺序也不稳定；共享写要用锁、分片或单 owner。

::interviewer::
如果现场现象和预期不一致，Go怎么继续缩小范围？

::candidate level="deep"::
用 goroutine、scheduler latency、block/mutex profile、heap profile 和 race detector 验证判断，压测要观察随并发增长的变化。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
调大 GOMAXPROCS 或堆更多 goroutine 不能解决下游饱和。调度器只分配 CPU，系统仍需要背压、超时和容量边界。
