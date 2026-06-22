---
id: java-backend-rocketmq-example-1
title: RocketMQ 怎么降低消息丢失风险，重复消费又怎么处理？
slug: java-backend-rocketmq-example-1
tracks:
  - java-backend
category: rocketmq
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - RocketMQ
  - 消息可靠性
  - 事务消息
  - 消费重试
summary: 从发送结果、Broker 存储、消费进度、消息轨迹和业务幂等排查消息可靠性。
estimatedRead: 5
---

::interviewer::
RocketMQ 里一条消息从发送到消费，哪些环节可能丢？

::candidate level="core"::
我会分三段看：生产者发送到 Broker、Broker 存储和复制、消费者处理并提交进度。生产者超时不代表 Broker 没收到，Broker 写入成功也不代表所有副本都同步，消费者处理成功但提交 offset 前挂掉也会重复投递。所以可靠性不能只看 send 返回成功，要看消息轨迹和业务最终状态。

::interviewer::
线上用户说订单状态没推进，你怎么查消息到底发没发、消费没消费？

::candidate::
我会先拿业务 key，比如 orderId。用 RocketMQ 控制台或 `mqadmin queryMsgByKey -n <namesrv> -t <topic> -k <orderId>` 查消息是否存在，再用 `mqadmin queryMsgById` 或控制台看投递轨迹。然后查 consumer group 的进度，`mqadmin consumerProgress -n <namesrv> -g <group>` 看堆积，必要时 `mqadmin consumerStatus` 看消费线程和客户端连接状态。

::interviewer::
生产者发送超时了，你会直接重发吗？

::candidate level="deep"::
可以重试，但要承认可能重复。发送超时有两种可能：Broker 没收到，或者收到了但响应丢了。所以消息必须带业务唯一键，比如 `orderId + eventType`，消费端用唯一约束、幂等表或状态机兜住重复。面试里我会明确说：MQ 可靠投递通常按至少一次设计，业务要能接受重复。

::interviewer::
消费失败一直重试怎么办？

::candidate::
先看失败是不是可恢复。下游超时、数据库短暂抖动，可以延迟重试；反序列化失败、参数非法这类毒消息，继续重试只会阻塞队列。我要看重试次数、死信队列和错误日志，必要时查 `%DLQ%<group>` 里的消息，修复数据或代码后再人工补偿。

::interviewer::
怎么证明你的幂等设计真的有效？

::candidate::
我会写压测或集成测试模拟重复投递：同一 message key 并发消费两次、消费成功后提交 offset 前进程退出、下游失败触发重试。验证数据库最终只有一条业务结果，状态机没有倒退，日志能通过 messageId 和业务 key 串起来。只说“我们做了幂等”不够，要能拿最终状态证明。
