---
id: go-backend-job-scheduler-example-1
title: "分布式定时任务怎样保证不漏跑，也不因重复执行写脏数据？"
slug: go-backend-job-scheduler-example-1
tracks:
  - go-backend
category: job-scheduler
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "任务调度"
  - "租约"
  - "检查点"
  - "幂等执行"
summary: "围绕任务调度的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
分布式定时任务怎样保证不漏跑，也不因重复执行写脏数据？

::candidate level="core"::
调度器持久化任务实例和计划时间，通过租约领取；至少一次投递更现实，因此业务执行必须以任务实例 ID 幂等。扫描补偿处理漏触发，延迟与重复分别监控，不能只靠内存 cron。

::interviewer::
这个任务调度方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
监控计划时间、领取、开始、checkpoint、完成和重试事件，按 task_instance_id 串联日志，并注入宕机验证接管。

::interviewer::
任务调度发生部分失败时，系统怎样收敛？

::candidate::
Exactly-once 往往只是局部承诺。调度、网络和外部系统故障下仍要接受重复，真正边界在业务结果是否幂等。
