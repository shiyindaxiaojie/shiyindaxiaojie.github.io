---
id: python-engineer-order-payment-example-2
title: "渠道接口超时，Celery 自动重试前要确认什么？"
slug: python-engineer-order-payment-example-2
tracks:
  - python-engineer
category: order-payment
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "Python 支付"
  - "Celery"
  - "重复通知"
  - "渠道对账"
summary: "围绕Python 支付的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
渠道接口超时，Celery 自动重试前要确认什么？

::candidate level="deep"::
超时表示结果未知，先用稳定请求号查询渠道，而不是直接再次扣款。只有确认未受理且请求可幂等时才重试，并受总时限和次数约束。

::interviewer::
如果现场验证这项Python 支付判断，先看哪些指标或日志？

::candidate level="deep"::
把渠道流水、task_id、支付单、记账分录和 ack 日志串联，对账任务检查金额与状态差异。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
任务队列保证的是投递，不是业务 exactly-once。数据库约束、状态机和渠道幂等接口才是正确性边界。
