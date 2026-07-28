---
id: cloud-native-platform-story-example-2
title: "平台上线后，开发者为什么愿意用，而不是绕开它？"
slug: cloud-native-platform-story-example-2
tracks:
  - cloud-native
category: platform-story
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "平台经历"
  - "开发者体验"
  - "平台采用率"
  - "能力边界"
summary: "围绕平台经历的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
平台上线后，开发者为什么愿意用，而不是绕开它？

::candidate level="deep"::
采用不是靠行政要求。平台需要覆盖高频路径、提供清楚的错误反馈，也要允许少数复杂业务扩展。回答时用真实迁移阻力说明做过哪些取舍，例如保留旧流程多久、哪些能力暂时不抽象。

::interviewer::
如果继续追数字，平台经历要拿出哪组证据？

::candidate level="deep"::
采用率、自助完成率、接入周期、工单量和失败原因能组成证据；还应区分主动使用与被强制迁移。

::interviewer::
平台经历最容易被忽略的边界是什么？

::candidate::
平台把所有差异都隐藏后，排障和特殊需求会反噬抽象。应公开底层状态，并给高级用户受控的扩展点。
