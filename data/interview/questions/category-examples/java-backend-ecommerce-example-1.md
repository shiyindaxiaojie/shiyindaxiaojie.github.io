---
id: java-backend-ecommerce-example-1
title: "订单创建成功但库存服务超时，订单状态怎么收敛？"
slug: java-backend-ecommerce-example-1
tracks:
  - java-backend
category: ecommerce
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "电商订单"
  - "库存预占"
  - "状态机"
  - "最终一致性"
summary: "围绕电商订单的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
订单创建成功但库存服务超时，订单状态怎么收敛？

::candidate level="core"::
订单先以明确的中间态落库，再通过可靠消息或任务推进库存预占；超时只代表结果未知，不能直接判失败。消费幂等、状态机条件更新、超时关单和对账任务共同把状态收敛。

::interviewer::
这条电商订单链路上线后，用什么证据验证设计？

::candidate level="deep"::
按 order_id 串起订单状态、库存流水、消息投递和补偿日志，并统计长时间停留在中间态的数量与时长。

::interviewer::
电商订单里最容易漏掉的失败分支是什么？

::candidate::
最终一致不代表无限等待。每个中间态都要有超时、可重试边界和人工处置入口，且补偿不能突破已支付等不可逆状态。
