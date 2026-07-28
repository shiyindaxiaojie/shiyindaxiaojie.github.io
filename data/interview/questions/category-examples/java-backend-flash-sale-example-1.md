---
id: java-backend-flash-sale-example-1
title: "秒杀请求进来后，哪一层负责挡住绝大多数无效流量？"
slug: java-backend-flash-sale-example-1
tracks:
  - java-backend
category: flash-sale
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "秒杀"
  - "流量削峰"
  - "库存预扣"
  - "防超卖"
summary: "围绕秒杀的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
秒杀请求进来后，哪一层负责挡住绝大多数无效流量？

::candidate level="core"::
静态资源和资格校验尽量前移，网关按用户与活动限流，服务端用令牌控制进入核心链路的数量。库存预扣要在 Redis 原子执行，成功请求进入有界队列异步下单；数据库只承接已被削峰的有效流量。

::interviewer::
这个秒杀方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
压测同时看网关拒绝、Redis 延迟、队列堆积、订单成功率和数据库锁等待，按请求 ID 追踪预扣到订单的完整链路。

::interviewer::
秒杀发生部分失败时，系统怎样收敛？

::candidate::
缓存库存是快速闸门，不是最终账本。活动结束、故障恢复和人工补偿都要能从持久流水重建，不能只信一个计数 key。
