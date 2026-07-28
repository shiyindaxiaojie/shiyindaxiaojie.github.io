---
id: go-backend-service-story-example-1
title: "挑一个你真正负责过的 Go 服务，先讲它为什么值得用 Go。"
slug: go-backend-service-story-example-1
tracks:
  - go-backend
category: service-story
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "Go 服务"
  - "服务边界"
  - "pprof 分析"
  - "线上排障"
summary: "围绕Go 服务的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
挑一个你真正负责过的 Go 服务，先讲它为什么值得用 Go。

::candidate level="core"::
先说服务的流量、延迟目标和并发模型，再说明 Go 在部署体积、并发或工程效率上的实际价值。重点放在自己负责的接口、数据和稳定性边界，不能把“用了 goroutine”当项目亮点。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
用服务 SLI、pprof、Trace、发布记录和事故时间线证明问题与改动，结果只能引用可解释的真实数据。

::interviewer::
Go 服务这段经历还有什么代价或没解决的问题？

::candidate::
Go 的并发写法简洁不代表没有资源边界。每个 goroutine、连接和队列都要能取消、限流和观测。
