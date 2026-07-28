---
id: ai-agent-workflow-agent-example-2
title: "工作流 Agent 要执行退款，怎样设计确认与补偿？"
slug: ai-agent-workflow-agent-example-2
tracks:
  - ai-agent
category: workflow-agent
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "工作流 Agent"
  - "状态机"
  - "高风险确认"
  - "补偿"
summary: "围绕工作流 Agent的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
工作流 Agent 要执行退款，怎样设计确认与补偿？

::candidate level="deep"::
先校验订单与权限，模型只提出退款请求，执行层展示金额和原因给用户确认，再用幂等键调用渠道。结果未知时查询状态，成功后推进状态，失败进入重试或人工；补偿动作同样需要权限和审计。

::interviewer::
这项工作流 Agent设计怎么证明不是纸上方案？

::candidate level="deep"::
按 workflow_id/step_id 保存状态、确认、工具调用和业务结果，故障注入覆盖重试、超时与人工接管。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
把所有分支硬编码会失去 Agent 价值，全部交给模型又不可控。边界由副作用、可逆性和错误成本决定。
