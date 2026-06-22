---
id: java-backend-rocketmq-example-2
title: 事务消息的回查机制解决了什么一致性边界？
slug: java-backend-rocketmq-example-2
tracks:
  - java-backend
category: rocketmq
difficulty: senior
questionType: scenario
frequency: high
tags:
  - RocketMQ
  - 消息可靠性
  - 事务消息
  - 消费重试
summary: 用半消息、本地事务状态表、回查日志和消息轨迹定位事务消息的一致性边界。
estimatedRead: 5
---

::interviewer::
为什么 RocketMQ 要有事务消息？普通发送加本地事务不行吗？

::candidate level="deep"::
普通发送和本地事务不是一个原子操作。订单入库成功后服务挂了，消息可能没发出去；先发消息再入库，又可能下游看到不存在的订单。事务消息的核心是先发半消息，本地事务成功后再提交消息；如果生产者没反馈，Broker 通过回查问生产者本地事务到底成没成。

::interviewer::
回查时你具体查什么？

::candidate::
我不会查内存状态，必须查可持久化的本地事务结果。常见做法是订单表加本地事务日志表，回查时按 transactionId 或 orderId 查状态：成功就 COMMIT，明确失败就 ROLLBACK，状态还不确定就返回 UNKNOWN 等下次回查。回查日志里要打印 transactionId、业务 key 和返回状态，方便和消息轨迹对齐。

::interviewer::
线上怀疑事务消息卡在半消息，你怎么排查？

::candidate level="deep"::
我会先查生产者日志，看本地事务执行后有没有提交或回滚；再查 Broker 或控制台里的事务消息状态和回查次数。命令层面会用 `mqadmin queryMsgByKey -n <namesrv> -t <topic> -k <bizKey>` 查消息，用控制台看轨迹；同时查本地事务表确认业务状态。如果回查次数异常升高，说明生产者提交结果不稳定或回查逻辑查不到状态。

::interviewer::
事务消息是不是就解决了分布式事务？

::candidate::
不是。它只解决本地事务和“发出消息”之间的最终一致性。消费者侧仍然可能重复消费、消费失败或延迟消费，所以还要有幂等、重试、死信和补偿。也就是说它保证事件最终能按本地事务结果被提交或回滚，不保证整个下游链路强一致。

::interviewer::
你会给事务消息加哪些监控？

::candidate::
我会看半消息堆积、回查次数、UNKNOWN 比例、提交/回滚比例、消费堆积和死信数量。业务侧还要有本地事务表状态分布，比如 INIT 状态超过 5 分钟还没结束就告警。没有这些指标，事务消息出问题时很难判断是生产者、本地事务、Broker 回查还是消费者卡住。
