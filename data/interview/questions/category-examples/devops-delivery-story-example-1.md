---
id: devops-delivery-story-example-1
title: "介绍一次你把发布流程从“靠人记”改成可重复交付的经历。"
slug: devops-delivery-story-example-1
tracks:
  - devops
category: delivery-story
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "交付链路"
  - "发布频率"
  - "变更失败率"
  - "职责边界"
summary: "围绕交付链路的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
介绍一次你把发布流程从“靠人记”改成可重复交付的经历。

::candidate level="core"::
先交代原来的发布链路：多少服务、多久发一次、哪些步骤靠人工、失败后多久能恢复。然后只讲自己改动的那一段，例如统一制品、补质量门禁或把回滚变成一键动作。结果必须来自真实发布记录，没有数字就说明数据从哪里取，不能临场编一个漂亮比例。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
证据看变更前后的交付周期、部署频率、变更失败率和平均恢复时间，再把指标与具体发布记录、回滚记录对齐。

::interviewer::
交付链路这段经历还有什么代价或没解决的问题？

::candidate::
只追求发布更快会把风险推到生产。质量门禁、审批和自动回滚要随风险分级，低风险变更才能走更短路径。
