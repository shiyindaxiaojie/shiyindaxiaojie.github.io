---
id: ai-agent-customer-service-example-2
title: "知识库有多个版本的政策，客服 Agent 怎样避免引用过期内容？"
slug: ai-agent-customer-service-example-2
tracks:
  - ai-agent
category: customer-service
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "智能客服"
  - "人工接管"
  - "政策版本"
  - "引用证据"
summary: "围绕智能客服的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
知识库有多个版本的政策，客服 Agent 怎样避免引用过期内容？

::candidate level="deep"::
文档带生效时间、适用地区和版本，检索时按用户上下文过滤，答案必须引用来源。冲突时优先权威且当前有效版本，无法判断就拒答或转人工；索引更新与内容发布要有可追踪延迟。

::interviewer::
这项智能客服设计怎么证明不是纸上方案？

::candidate level="deep"::
看任务解决率、错误解决、转人工、重复咨询、引用正确率和用户反馈，并抽样回放完整对话 Trace。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
只优化单轮命中会诱导模型自信回答。客服流程还要处理身份校验、上下文变更和人工接管后的状态一致。
