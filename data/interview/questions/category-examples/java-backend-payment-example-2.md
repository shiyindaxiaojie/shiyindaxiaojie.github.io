---
id: java-backend-payment-example-2
title: "用户扣款成功但系统显示失败，排查和补偿链路怎么设计？"
slug: java-backend-payment-example-2
tracks:
  - java-backend
category: payment
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "支付系统"
  - "回调幂等"
  - "对账"
  - "状态机"
summary: "围绕支付系统的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
用户扣款成功但系统显示失败，排查和补偿链路怎么设计？

::candidate level="deep"::
先把结果标成未知而不是失败，保存请求号并主动查询渠道。仍未知时进入对账队列，确认成功后补发业务事件，确认失败才允许重试支付；所有补偿都要防止二次记账。

::interviewer::
这项支付系统设计怎么证明不是纸上方案？

::candidate level="deep"::
用支付单、渠道流水、回调日志、主动查询与账单对账按唯一请求号闭合证据，金额和币种必须逐项核对。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
支付状态更新与业务发货不是一个事务。可靠消息、幂等消费和日终对账都需要，任何单一路径都可能在故障窗口丢失。
