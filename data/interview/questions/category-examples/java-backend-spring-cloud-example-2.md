---
id: java-backend-spring-cloud-example-2
title: "超时、重试和熔断为什么必须按整条调用链一起设计？"
slug: java-backend-spring-cloud-example-2
tracks:
  - java-backend
category: spring-cloud
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Spring Cloud"
  - "服务治理"
  - "超时重试"
  - "熔断降级"
summary: "围绕Spring Cloud的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
超时、重试和熔断为什么必须按整条调用链一起设计？

::candidate level="deep"::
上游超时必须大于内部总预算，重试只用于幂等且仍有时间预算的请求，并配退避；连续失败时熔断快速失败。各层独立默认重试会产生乘法放大，所以网关、客户端和服务端要统一次数与 deadline。

::interviewer::
如果现场现象和预期不一致，Spring Cloud怎么继续缩小范围？

::candidate level="deep"::
Trace 中记录每一跳耗时和重试次数，再结合连接池、熔断状态与下游错误码；仅看最终 500 无法定位放大点。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
熔断恢复时的半开流量也可能再次压垮下游。恢复探测、并发上限和缓存/降级结果必须一起设计。
