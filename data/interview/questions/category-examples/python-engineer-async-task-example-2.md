---
id: python-engineer-async-task-example-2
title: "长任务执行到一半失败，状态和进度怎么恢复？"
slug: python-engineer-async-task-example-2
tracks:
  - python-engineer
category: async-task
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "异步任务"
  - "任务状态"
  - "检查点"
  - "幂等结果"
summary: "围绕异步任务的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
长任务执行到一半失败，状态和进度怎么恢复？

::candidate level="deep"::
把工作拆成可提交的阶段，每阶段保存 checkpoint 和输出摘要。接管者从最后成功阶段继续，临时文件和外部写入都有幂等或补偿；进度必须来自已持久化结果，不靠内存百分比。

::interviewer::
这项异步任务设计怎么证明不是纸上方案？

::candidate level="deep"::
按 task_id 串联 API、数据库、broker、worker 和结果存储，监控队列年龄、状态停留、重试与孤儿任务。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
任务状态更新和消息 ack 之间仍有故障窗口。系统要接受重复执行，并保证结果提交的原子性与幂等性。
