---
id: java-backend-ecommerce-example-2
title: "商品价格在下单瞬间变化，订单里该相信哪个价格？"
slug: java-backend-ecommerce-example-2
tracks:
  - java-backend
category: ecommerce
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "电商订单"
  - "库存预占"
  - "状态机"
  - "最终一致性"
summary: "围绕电商订单的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
商品价格在下单瞬间变化，订单里该相信哪个价格？

::candidate level="deep"::
订单应保存下单时经过规则计算的价格快照，并记录促销、优惠和版本依据。展示价变化不能回写历史订单；真正扣款前若业务要求二次确认，也要通过状态转换而不是覆盖原价。

::interviewer::
这项电商订单设计怎么证明不是纸上方案？

::candidate level="deep"::
按 order_id 串起订单状态、库存流水、消息投递和补偿日志，并统计长时间停留在中间态的数量与时长。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
最终一致不代表无限等待。每个中间态都要有超时、可重试边界和人工处置入口，且补偿不能突破已支付等不可逆状态。
