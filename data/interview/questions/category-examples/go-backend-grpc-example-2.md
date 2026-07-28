---
id: go-backend-grpc-example-2
title: "gRPC streaming 怎么处理背压和断线恢复？"
slug: go-backend-grpc-example-2
tracks:
  - go-backend
category: grpc
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "gRPC"
  - "Deadline"
  - "流式背压"
  - "断线恢复"
summary: "围绕gRPC的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
gRPC streaming 怎么处理背压和断线恢复？

::candidate level="deep"::
发送与接收都要有有界缓冲，慢消费者应让生产端等待、降采样或断开，而不是无限堆内存。断线恢复需要序列号、确认位点和幂等处理，重新连接后从已确认位置继续。

::interviewer::
如果现场现象和预期不一致，gRPC怎么继续缩小范围？

::candidate level="deep"::
用 Trace 查看 deadline 传播、状态码和重试次数，监控 stream 数、消息速率、缓冲水位、断线与恢复位点。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
Canceled 不一定是服务故障，可能是客户端主动放弃。指标要区分 DeadlineExceeded、Canceled 和应用状态码，避免错误重试。
