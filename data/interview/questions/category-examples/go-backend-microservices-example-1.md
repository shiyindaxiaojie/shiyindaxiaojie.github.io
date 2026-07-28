---
id: go-backend-microservices-example-1
title: "微服务边界怎么定，拆错了会出现什么信号？"
slug: go-backend-microservices-example-1
tracks:
  - go-backend
category: microservices
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "微服务"
  - "服务边界"
  - "Saga 补偿"
  - "数据 ownership"
summary: "围绕微服务的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
微服务边界怎么定，拆错了会出现什么信号？

::candidate level="core"::
边界优先跟业务能力、数据 ownership 和变化节奏对齐，而不是按表或技术层拆。若一个需求总要同时改多个服务、跨服务查询泛滥、发布强绑定，说明边界可能切穿了事务与团队责任。

::interviewer::
别停在原理上，微服务落到线上先看什么证据？

::candidate level="deep"::
统计跨服务调用、共同发布、分布式 Trace 扇出和事件积压，再结合领域模型与团队边界判断，不凭服务数量评估。

::interviewer::
微服务这套判断在哪个边界下会失效？

::candidate::
最终一致会暴露中间态。产品必须定义用户看到什么、等待多久和如何查询，不能只在后端画 Saga 图。
