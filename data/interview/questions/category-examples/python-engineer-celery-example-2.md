---
id: python-engineer-celery-example-2
title: "Celery worker 堆积，先看生产、消费还是下游？"
slug: python-engineer-celery-example-2
tracks:
  - python-engineer
category: celery
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Celery"
  - "任务重试"
  - "幂等"
  - "队列堆积"
summary: "围绕Celery的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Celery worker 堆积，先看生产、消费还是下游？

::candidate level="deep"::
先比较入队率和完成率，再看排队时长、active/reserved、任务耗时与失败分布。消费能力正常但任务变慢时继续查数据库、外部 API 和连接池；盲目加 worker 可能压垮下游。

::interviewer::
如果现场现象和预期不一致，Celery怎么继续缩小范围？

::candidate level="deep"::
按 task_id 与业务幂等键串联 broker、worker 日志和数据库状态，监控重试、死信、执行时长和队列年龄。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
acks_late 会提高故障后的重投概率，也要求任务真正幂等。长任务还要处理 visibility timeout 与 worker 被强杀。
