---
id: ai-agent-customer-service-example-1
title: "智能客服什么时候直接回答，什么时候转人工？"
slug: ai-agent-customer-service-example-1
tracks:
  - ai-agent
category: customer-service
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "智能客服"
  - "人工接管"
  - "政策版本"
  - "引用证据"
summary: "围绕智能客服的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
智能客服什么时候直接回答，什么时候转人工？

::candidate level="core"::
先按意图和风险分层。低风险且证据充分的常见问题直接答；账户、金额、投诉或低置信度场景转人工，并把已收集信息和引用一起交接。转人工率不是越低越好，错误自动处理的成本更高。

::interviewer::
这条智能客服链路上线后，用什么证据验证设计？

::candidate level="deep"::
看任务解决率、错误解决、转人工、重复咨询、引用正确率和用户反馈，并抽样回放完整对话 Trace。

::interviewer::
智能客服里最容易漏掉的失败分支是什么？

::candidate::
只优化单轮命中会诱导模型自信回答。客服流程还要处理身份校验、上下文变更和人工接管后的状态一致。
