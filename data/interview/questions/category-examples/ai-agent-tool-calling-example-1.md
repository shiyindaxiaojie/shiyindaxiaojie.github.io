---
id: ai-agent-tool-calling-example-1
title: "模型调用工具时，为什么权限和参数校验不能交给模型自己判断？"
slug: ai-agent-tool-calling-example-1
tracks:
  - ai-agent
category: tool-calling
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "工具调用"
  - "权限边界"
  - "参数校验"
  - "审计追踪"
summary: "围绕工具调用的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
模型调用工具时，为什么权限和参数校验不能交给模型自己判断？

::candidate level="core"::
模型输出只是候选调用。执行层用 schema 校验、身份与资源授权、风险分级和审计决定能否执行，高风险动作还需用户确认。工具凭证最小权限且不进入 Prompt，模型不能通过换一种说法提升权限。

::interviewer::
别停在原理上，工具调用落到线上先看什么证据？

::candidate level="deep"::
审计保存用户意图、模型提议、校验结果、最终参数、工具响应和副作用 ID，按 tool_call_id 串起完整 Trace。

::interviewer::
工具调用这套判断在哪个边界下会失效？

::candidate::
参数合法不代表业务安全。批量、金额、目标环境和数据导出还要做语义限制与 blast radius 控制。
