---
id: go-backend-concurrency-example-1
title: "Go 服务里 goroutine 泄漏通常怎么产生，怎么定位？"
slug: go-backend-concurrency-example-1
tracks:
  - go-backend
category: concurrency
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Go 并发"
  - "goroutine 泄漏"
  - "worker pool"
  - "背压"
summary: "围绕Go 并发的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Go 服务里 goroutine 泄漏通常怎么产生，怎么定位？

::candidate level="core"::
常见来源是 channel 无人收发、忘记停止 ticker、下游调用没有 deadline，或子 goroutine 没监听 context。先看 goroutine 数趋势，再比较多份 profile 的栈聚合，找到持续增长的创建点和阻塞位置。

::interviewer::
别停在原理上，Go 并发落到线上先看什么证据？

::candidate level="deep"::
用 goroutine profile diff、block profile、运行时指标、Trace 和压测后的基线回落验证；单次快照很难证明泄漏。

::interviewer::
Go 并发这套判断在哪个边界下会失效？

::candidate::
关闭 channel 的 owner 必须唯一，取消也不等于 goroutine 自动退出。所有阻塞点都要 select context，外部库还需确认真正支持取消。
