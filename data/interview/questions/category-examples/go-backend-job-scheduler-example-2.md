---
id: go-backend-job-scheduler-example-2
title: "任务执行十分钟后实例宕机，新的 worker 从哪里继续？"
slug: go-backend-job-scheduler-example-2
tracks:
  - go-backend
category: job-scheduler
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "任务调度"
  - "租约"
  - "检查点"
  - "幂等执行"
summary: "围绕任务调度的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
任务执行十分钟后实例宕机，新的 worker 从哪里继续？

::candidate level="deep"::
worker 定期续租并写 checkpoint，租约过期后其他 worker 才能接管。从最近成功 checkpoint 继续，外部副作用用幂等键或状态机保护；无法分段的任务只能从头重算，但结果提交必须原子。

::interviewer::
如果现场验证这项任务调度判断，先看哪些指标或日志？

::candidate level="deep"::
监控计划时间、领取、开始、checkpoint、完成和重试事件，按 task_instance_id 串联日志，并注入宕机验证接管。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
Exactly-once 往往只是局部承诺。调度、网络和外部系统故障下仍要接受重复，真正边界在业务结果是否幂等。
