---
id: ai-agent-multi-agent-example-2
title: "两个 Agent 对同一任务给出冲突结论，谁来裁决？"
slug: ai-agent-multi-agent-example-2
tracks:
  - ai-agent
category: multi-agent
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "多 Agent"
  - "任务协调"
  - "冲突裁决"
  - "协作成本"
summary: "围绕多 Agent的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
两个 Agent 对同一任务给出冲突结论，谁来裁决？

::candidate level="deep"::
共享事实放在结构化任务状态里，结论带证据与置信度。协调器按规则检查冲突，能用工具验证就验证，无法验证则请求人工或用户澄清；不能再让一个无依据的模型随意“投票”。

::interviewer::
这项多 Agent设计怎么证明不是纸上方案？

::candidate level="deep"::
Trace 展示每个 Agent 的输入、输出、工具、token、耗时与交接，和单 Agent 基线比较任务成功率及成本。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
并行 Agent 可能同时产生副作用。写操作必须集中调度、幂等并按资源加锁，不能只依赖自然语言协商。
