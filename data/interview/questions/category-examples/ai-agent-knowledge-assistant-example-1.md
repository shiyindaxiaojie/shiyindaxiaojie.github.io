---
id: ai-agent-knowledge-assistant-example-1
title: "企业知识助手怎样回答“我有权限知道什么”，而不是只看召回相关度？"
slug: ai-agent-knowledge-assistant-example-1
tracks:
  - ai-agent
category: knowledge-assistant
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "知识助手"
  - "文档 ACL"
  - "索引更新"
  - "数据血缘"
summary: "围绕知识助手的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
企业知识助手怎样回答“我有权限知道什么”，而不是只看召回相关度？

::candidate level="core"::
检索前先用用户身份与文档 ACL 过滤候选，切块继承原文权限，缓存键也包含授权上下文。生成只能看到已授权证据，引用链接再次鉴权；不能先召回敏感内容再要求模型“不要说”。

::interviewer::
这条知识助手链路上线后，用什么证据验证设计？

::candidate level="deep"::
审计用户、查询、候选文档权限、最终引用、索引版本和拒绝原因，定期做跨权限越权测试。

::interviewer::
知识助手里最容易漏掉的失败分支是什么？

::candidate::
文档级权限可能在切块和摘要后丢失。所有派生数据都要保留 lineage 与最严格来源权限，删除也必须级联。
