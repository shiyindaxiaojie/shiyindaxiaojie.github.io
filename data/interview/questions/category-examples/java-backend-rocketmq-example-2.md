---
id: java-backend-rocketmq-example-2
title: "事务消息的回查机制解决了什么，又没解决什么？"
slug: java-backend-rocketmq-example-2
tracks:
  - java-backend
category: rocketmq
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "RocketMQ"
  - "消息可靠性"
  - "幂等消费"
  - "事务消息"
summary: "围绕RocketMQ的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
事务消息的回查机制解决了什么，又没解决什么？

::candidate level="deep"::
半消息让本地事务先执行，Broker 在状态未知时回查生产者，再决定提交或回滚消息。它缓解了本地事务与发消息的原子性窗口，但回查服务不可用、消费失败和跨系统最终一致仍要靠重试、对账与补偿。

::interviewer::
如果现场现象和预期不一致，RocketMQ怎么继续缩小范围？

::candidate level="deep"::
核对生产发送日志、Broker 存储与复制状态、消费位点、重试/死信队列和业务表状态，按 message key 串起完整证据链。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
无限重试会让毒消息拖垮消费组。要设置退避、最大次数、死信告警和人工修复，并保证修复操作仍然幂等。
