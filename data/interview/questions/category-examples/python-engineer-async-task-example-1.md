---
id: python-engineer-async-task-example-1
title: "一个异步任务提交后，用户怎样知道它没丢、没重复？"
slug: python-engineer-async-task-example-1
tracks:
  - python-engineer
category: async-task
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "异步任务"
  - "任务状态"
  - "检查点"
  - "幂等结果"
summary: "围绕异步任务的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一个异步任务提交后，用户怎样知道它没丢、没重复？

::candidate level="core"::
API 先持久化任务与幂等键，再投递消息并返回 task_id。用户查询明确的 queued/running/succeeded/failed 状态；worker 以 task_id 幂等提交结果，后台扫描长期未推进任务。

::interviewer::
这条异步任务链路上线后，用什么证据验证设计？

::candidate level="deep"::
按 task_id 串联 API、数据库、broker、worker 和结果存储，监控队列年龄、状态停留、重试与孤儿任务。

::interviewer::
异步任务里最容易漏掉的失败分支是什么？

::candidate::
任务状态更新和消息 ack 之间仍有故障窗口。系统要接受重复执行，并保证结果提交的原子性与幂等性。
