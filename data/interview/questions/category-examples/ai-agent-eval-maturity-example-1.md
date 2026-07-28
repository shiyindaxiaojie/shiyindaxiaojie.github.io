---
id: ai-agent-eval-maturity-example-1
title: "你们最早怎么评测 Agent，后来为什么换了方法？"
slug: ai-agent-eval-maturity-example-1
tracks:
  - ai-agent
category: eval-maturity
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "评测体系"
  - "回归评测"
  - "发布门禁"
  - "失败样本"
summary: "围绕评测体系的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
你们最早怎么评测 Agent，后来为什么换了方法？

::candidate level="core"::
可以按成熟度讲真实演进：先从人工样例发现大问题，再沉淀失败集和自动指标，最后用线上反馈补分布漂移。每次升级都应对应一个曾经漏掉的风险，而不是为了做一张更复杂的分数表。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
证据包括评测集版本、失败样本来源、人工一致率、发布门禁记录和线上回流时延，指标变化要能追到具体样本。

::interviewer::
评测体系这段经历还有什么代价或没解决的问题？

::candidate::
评测集会被模型与团队逐渐过拟合。需要隐藏集、周期抽样和分布监控，不能让开发只优化已知题目。
