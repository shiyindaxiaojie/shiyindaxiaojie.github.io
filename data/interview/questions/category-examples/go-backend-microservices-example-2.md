---
id: go-backend-microservices-example-2
title: "跨服务事务不适合 2PC 时，补偿流程怎么设计？"
slug: go-backend-microservices-example-2
tracks:
  - go-backend
category: microservices
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "微服务"
  - "服务边界"
  - "Saga 补偿"
  - "数据 ownership"
summary: "围绕微服务的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
跨服务事务不适合 2PC 时，补偿流程怎么设计？

::candidate level="deep"::
把业务拆成可持久化的本地步骤，每步有幂等键、明确状态和对应补偿；用事件或编排器推进。补偿不是数据库回滚，可能是退款、释放资源等新业务动作，必须允许失败后重试和人工接管。

::interviewer::
如果现场现象和预期不一致，微服务怎么继续缩小范围？

::candidate level="deep"::
统计跨服务调用、共同发布、分布式 Trace 扇出和事件积压，再结合领域模型与团队边界判断，不凭服务数量评估。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
最终一致会暴露中间态。产品必须定义用户看到什么、等待多久和如何查询，不能只在后端画 Saga 图。
