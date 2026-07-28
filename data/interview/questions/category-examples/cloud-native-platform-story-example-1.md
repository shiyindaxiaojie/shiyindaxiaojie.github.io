---
id: cloud-native-platform-story-example-1
title: "介绍一次你把 Kubernetes 能力做成团队可复用平台的经历。"
slug: cloud-native-platform-story-example-1
tracks:
  - cloud-native
category: platform-story
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "平台经历"
  - "开发者体验"
  - "平台采用率"
  - "能力边界"
summary: "围绕平台经历的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
介绍一次你把 Kubernetes 能力做成团队可复用平台的经历。

::candidate level="core"::
先说明用户原来要完成什么任务、卡在哪些工单和手工步骤，再讲自己负责的平台边界。能力可以是模板、发布、观测或权限，但结果要落到接入时间、发布失败率或自助率，不能只报“接入了多少集群”。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
采用率、自助完成率、接入周期、工单量和失败原因能组成证据；还应区分主动使用与被强制迁移。

::interviewer::
平台经历这段经历还有什么代价或没解决的问题？

::candidate::
平台把所有差异都隐藏后，排障和特殊需求会反噬抽象。应公开底层状态，并给高级用户受控的扩展点。
