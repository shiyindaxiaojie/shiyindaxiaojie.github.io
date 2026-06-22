---
id: system-design-idempotency
title: 下单接口怎么做幂等，为什么只靠前端防重不够？
slug: system-design-idempotency
tracks:
  - java-backend
  - go-backend
  - python-engineer
category: order-payment
difficulty: senior
questionType: system-design
frequency: high
tags:
  - idempotency
  - order
  - distributed
summary: 这题很适合区分“只会讲 token”的回答和真正懂链路设计的回答。
estimatedRead: 7
related:
  - redis-distributed-lock
---

::interviewer::
下单接口怎么做幂等？

::candidate level="core"::
前端防重只能降低重复点击，真正的幂等一定要落在服务端，用业务唯一键或幂等键约束同一请求只生效一次。

::interviewer::
如果请求超时重试了呢？

::candidate::
我会把请求唯一标识和订单状态机结合起来：

1. 服务端先校验幂等键是否已处理。
2. 如果未处理，进入下单流程并记录处理中状态。
3. 完成后写入最终结果，后续重复请求直接返回历史结果。

::candidate level="deep"::
进一步要注意幂等窗口、状态恢复和异步一致性。  
比如支付回调乱序、MQ 重投、数据库主从延迟，都可能让“看起来重复”的请求在不同节点上再次生效。

::note::
这题的好答案不是只说 Redis 或 token，而是能把请求唯一性、状态机、重试、回放这几件事串起来。
