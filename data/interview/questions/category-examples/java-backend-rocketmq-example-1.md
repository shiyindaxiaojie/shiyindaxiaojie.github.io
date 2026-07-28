---
id: java-backend-rocketmq-example-1
title: "RocketMQ 怎么降低消息丢失风险，重复消费怎么处理？"
slug: java-backend-rocketmq-example-1
tracks:
  - java-backend
category: rocketmq
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "RocketMQ"
  - "消息可靠性"
  - "幂等消费"
  - "事务消息"
summary: "围绕RocketMQ的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
RocketMQ 怎么降低消息丢失风险，重复消费怎么处理？

::candidate level="core"::
生产端要确认发送结果并对可重试错误做有界重试，Broker 侧根据可靠性要求选择同步刷盘和副本策略，消费端只在业务落库成功后确认。链路仍可能至少一次投递，所以消费逻辑必须以业务唯一键、状态机或去重表保证幂等。

::interviewer::
别停在原理上，RocketMQ落到线上先看什么证据？

::candidate level="deep"::
核对生产发送日志、Broker 存储与复制状态、消费位点、重试/死信队列和业务表状态，按 message key 串起完整证据链。

::interviewer::
RocketMQ这套判断在哪个边界下会失效？

::candidate::
无限重试会让毒消息拖垮消费组。要设置退避、最大次数、死信告警和人工修复，并保证修复操作仍然幂等。
