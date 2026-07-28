---
id: cloud-native-team-maturity-example-1
title: "怎么判断一个云原生团队是在“用 Kubernetes”，还是已经具备平台治理能力？"
slug: cloud-native-team-maturity-example-1
tracks:
  - cloud-native
category: team-maturity
stage: reverse
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "团队成熟度"
  - "平台治理"
  - "交付效能"
  - "错误预算"
summary: "围绕团队成熟度的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎么判断一个云原生团队是在“用 Kubernetes”，还是已经具备平台治理能力？

::candidate level="core"::
可以问新服务接入、权限、发布、观测和升级分别由谁完成，是否有标准路径与自助能力。只会维护集群不等于平台治理；成熟团队还会管理租户边界、版本生命周期和开发者体验。

::interviewer::
对方只给一句标准答案时，团队成熟度还能追问什么证据？

::candidate level="deep"::
观察是否有 SLO、错误预算、升级演练、平台采用率和用户反馈闭环；这些是团队能力的可核验信号。

::interviewer::
什么回答会让你继续确认团队成熟度的风险？

::candidate::
流程和指标齐全也可能只是形式。继续追问一个指标变差后具体做了什么，才能区分治理闭环与报表文化。
