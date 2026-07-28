---
id: ai-agent-tool-calling-example-2
title: "工具返回超时或结果不确定，Agent 应该重试、降级还是追问？"
slug: ai-agent-tool-calling-example-2
tracks:
  - ai-agent
category: tool-calling
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "工具调用"
  - "权限边界"
  - "参数校验"
  - "审计追踪"
summary: "围绕工具调用的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
工具返回超时或结果不确定，Agent 应该重试、降级还是追问？

::candidate level="deep"::
先按工具语义分类：只读幂等调用可在预算内退避重试；有副作用且结果未知时先查询状态，不能直接重放；缺少必要参数就追问；非关键工具失败可以降级并明确告诉用户。

::interviewer::
如果现场现象和预期不一致，工具调用怎么继续缩小范围？

::candidate level="deep"::
审计保存用户意图、模型提议、校验结果、最终参数、工具响应和副作用 ID，按 tool_call_id 串起完整 Trace。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
参数合法不代表业务安全。批量、金额、目标环境和数据导出还要做语义限制与 blast radius 控制。
