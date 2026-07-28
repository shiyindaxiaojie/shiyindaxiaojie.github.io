---
id: go-backend-go-example-1
title: "Go 的 GMP 调度模型怎样影响高并发服务？"
slug: go-backend-go-example-1
tracks:
  - go-backend
category: go
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Go"
  - "GMP 调度"
  - "slice 内存"
  - "map 并发"
summary: "围绕Go的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Go 的 GMP 调度模型怎样影响高并发服务？

::candidate level="core"::
G 是 goroutine，M 是执行线程，P 持有可运行队列和执行资源；阻塞系统调用、网络轮询、抢占与 work stealing 共同影响调度。工程上更重要的是 goroutine 是否有界、阻塞是否可见，而不是背 P 与 CPU 数量关系。

::interviewer::
别停在原理上，Go落到线上先看什么证据？

::candidate level="deep"::
用 goroutine、scheduler latency、block/mutex profile、heap profile 和 race detector 验证判断，压测要观察随并发增长的变化。

::interviewer::
Go这套判断在哪个边界下会失效？

::candidate::
调大 GOMAXPROCS 或堆更多 goroutine 不能解决下游饱和。调度器只分配 CPU，系统仍需要背压、超时和容量边界。
