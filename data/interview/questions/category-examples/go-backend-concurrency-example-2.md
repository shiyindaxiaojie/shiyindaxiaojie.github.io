---
id: go-backend-concurrency-example-2
title: "worker pool 怎么同时做限流、取消和背压？"
slug: go-backend-concurrency-example-2
tracks:
  - go-backend
category: concurrency
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Go 并发"
  - "goroutine 泄漏"
  - "worker pool"
  - "背压"
summary: "围绕Go 并发的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
worker pool 怎么同时做限流、取消和背压？

::candidate level="deep"::
任务入口有界，worker 数受下游容量限制；提交在队列满时阻塞、拒绝或降级，不能无限缓存。每个任务接受 context，关闭时停止接收、取消执行并等待已启动任务在期限内退出。

::interviewer::
如果现场现象和预期不一致，Go 并发怎么继续缩小范围？

::candidate level="deep"::
用 goroutine profile diff、block profile、运行时指标、Trace 和压测后的基线回落验证；单次快照很难证明泄漏。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
关闭 channel 的 owner 必须唯一，取消也不等于 goroutine 自动退出。所有阻塞点都要 select context，外部库还需确认真正支持取消。
