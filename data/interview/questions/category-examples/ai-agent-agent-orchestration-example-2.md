---
id: ai-agent-agent-orchestration-example-2
title: "多步任务执行到一半失败，怎样保存状态并安全恢复？"
slug: ai-agent-agent-orchestration-example-2
tracks:
  - ai-agent
category: agent-orchestration
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Agent 编排"
  - "Planner/Executor 分工"
  - "状态恢复"
  - "幂等工具"
summary: "围绕Agent 编排的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
多步任务执行到一半失败，怎样保存状态并安全恢复？

::candidate level="deep"::
把计划、步骤输入、工具请求、结果和状态转换持久化。恢复时从最后一个已确认步骤继续，对有副作用的工具先查询结果或用幂等键重放；计划因环境变化失效时重新规划，而不是盲目续跑。

::interviewer::
如果现场现象和预期不一致，Agent 编排怎么继续缩小范围？

::candidate level="deep"::
Trace 按 run_id/step_id 记录计划版本、工具参数、token、耗时和状态，故障注入验证重启后的恢复与重复副作用。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
Memory 不是越多越好。长期记忆可能带入过期或敏感信息，必须有来源、作用域、过期和用户可控删除。
