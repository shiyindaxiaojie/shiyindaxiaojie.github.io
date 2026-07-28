---
id: python-engineer-celery-example-1
title: "Celery 任务重试时，怎么避免重复执行写脏数据？"
slug: python-engineer-celery-example-1
tracks:
  - python-engineer
category: celery
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Celery"
  - "任务重试"
  - "幂等"
  - "队列堆积"
summary: "围绕Celery的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Celery 任务重试时，怎么避免重复执行写脏数据？

::candidate level="core"::
为业务动作生成幂等键，在数据库用唯一约束或状态机保护；任务只在副作用提交成功后 ack。重试区分瞬时错误与永久错误，采用退避和上限，外部调用也传稳定请求号。

::interviewer::
别停在原理上，Celery落到线上先看什么证据？

::candidate level="deep"::
按 task_id 与业务幂等键串联 broker、worker 日志和数据库状态，监控重试、死信、执行时长和队列年龄。

::interviewer::
Celery这套判断在哪个边界下会失效？

::candidate::
acks_late 会提高故障后的重投概率，也要求任务真正幂等。长任务还要处理 visibility timeout 与 worker 被强杀。
