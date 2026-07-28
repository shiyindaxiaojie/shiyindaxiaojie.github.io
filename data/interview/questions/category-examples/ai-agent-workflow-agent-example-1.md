---
id: ai-agent-workflow-agent-example-1
title: "固定工作流和自主 Agent 怎么划边界？"
slug: ai-agent-workflow-agent-example-1
tracks:
  - ai-agent
category: workflow-agent
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "工作流 Agent"
  - "状态机"
  - "高风险确认"
  - "补偿"
summary: "围绕工作流 Agent的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
固定工作流和自主 Agent 怎么划边界？

::candidate level="core"::
规则稳定、风险高的主干用显式状态机，模型负责理解输入、填参数或选择受限分支；开放探索留给低风险步骤。这样关键路径可测试、可审计，模型也不需要自由生成整个流程。

::interviewer::
这条工作流 Agent链路上线后，用什么证据验证设计？

::candidate level="deep"::
按 workflow_id/step_id 保存状态、确认、工具调用和业务结果，故障注入覆盖重试、超时与人工接管。

::interviewer::
工作流 Agent里最容易漏掉的失败分支是什么？

::candidate::
把所有分支硬编码会失去 Agent 价值，全部交给模型又不可控。边界由副作用、可逆性和错误成本决定。
