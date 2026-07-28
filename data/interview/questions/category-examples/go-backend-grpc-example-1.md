---
id: go-backend-grpc-example-1
title: "gRPC 调用为什么必须设计 Deadline 和重试边界？"
slug: go-backend-grpc-example-1
tracks:
  - go-backend
category: grpc
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "gRPC"
  - "Deadline"
  - "流式背压"
  - "断线恢复"
summary: "围绕gRPC的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
gRPC 调用为什么必须设计 Deadline 和重试边界？

::candidate level="core"::
没有 Deadline 的调用会长期占用 goroutine、连接和下游资源。上游把剩余时间传递给下游，服务端在 context 取消后尽快停止；重试只用于可重放请求，并受总 deadline、次数和退避约束。

::interviewer::
别停在原理上，gRPC落到线上先看什么证据？

::candidate level="deep"::
用 Trace 查看 deadline 传播、状态码和重试次数，监控 stream 数、消息速率、缓冲水位、断线与恢复位点。

::interviewer::
gRPC这套判断在哪个边界下会失效？

::candidate::
Canceled 不一定是服务故障，可能是客户端主动放弃。指标要区分 DeadlineExceeded、Canceled 和应用状态码，避免错误重试。
