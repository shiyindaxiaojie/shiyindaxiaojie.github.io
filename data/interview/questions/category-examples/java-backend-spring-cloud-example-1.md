---
id: java-backend-spring-cloud-example-1
title: "Spring Cloud 的服务治理不只是注册发现，还包括哪些失败控制？"
slug: java-backend-spring-cloud-example-1
tracks:
  - java-backend
category: spring-cloud
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Spring Cloud"
  - "服务治理"
  - "超时重试"
  - "熔断降级"
summary: "围绕Spring Cloud的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Spring Cloud 的服务治理不只是注册发现，还包括哪些失败控制？

::candidate level="core"::
服务治理还包括负载均衡、健康摘除、配置管理、限流、熔断、灰度、观测和契约。注册中心只解决“地址在哪里”，不解决这个地址是否该接流量、失败后怎样保护下游。

::interviewer::
别停在原理上，Spring Cloud落到线上先看什么证据？

::candidate level="deep"::
Trace 中记录每一跳耗时和重试次数，再结合连接池、熔断状态与下游错误码；仅看最终 500 无法定位放大点。

::interviewer::
Spring Cloud这套判断在哪个边界下会失效？

::candidate::
熔断恢复时的半开流量也可能再次压垮下游。恢复探测、并发上限和缓存/降级结果必须一起设计。
