---
id: java-backend-flash-sale-example-2
title: "Redis 预扣成功但订单没创建，库存怎么归还并防超卖？"
slug: java-backend-flash-sale-example-2
tracks:
  - java-backend
category: flash-sale
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "秒杀"
  - "流量削峰"
  - "库存预扣"
  - "防超卖"
summary: "围绕秒杀的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Redis 预扣成功但订单没创建，库存怎么归还并防超卖？

::candidate level="deep"::
预扣记录必须带用户、商品和请求 ID，订单消费幂等。创建失败或超时后通过补偿任务归还，但归还也要按原记录原子执行，防止重复加库存；数据库库存与 Redis 定期对账。

::interviewer::
如果现场验证这项秒杀判断，先看哪些指标或日志？

::candidate level="deep"::
压测同时看网关拒绝、Redis 延迟、队列堆积、订单成功率和数据库锁等待，按请求 ID 追踪预扣到订单的完整链路。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
缓存库存是快速闸门，不是最终账本。活动结束、故障恢复和人工补偿都要能从持久流水重建，不能只信一个计数 key。
