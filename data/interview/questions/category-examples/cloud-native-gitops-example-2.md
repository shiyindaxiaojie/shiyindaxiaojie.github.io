---
id: cloud-native-gitops-example-2
title: "Argo CD 发现生产漂移时，应该自动同步还是人工确认？"
slug: cloud-native-gitops-example-2
tracks:
  - cloud-native
category: gitops
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "GitOps"
  - "声明式交付"
  - "状态漂移"
  - "Argo CD 同步"
summary: "围绕GitOps的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Argo CD 发现生产漂移时，应该自动同步还是人工确认？

::candidate level="deep"::
先按资源和风险分级。无状态、可逆且有健康检查的偏差可以自动同步；可能删除数据、替换集群资源或来自紧急修复的漂移要先告警和确认。同步策略必须配合 diff ignore 与维护窗口。

::interviewer::
如果现场现象和预期不一致，GitOps怎么继续缩小范围？

::candidate level="deep"::
证据来自 Git 提交、同步记录、资源 diff、健康状态和 Kubernetes 审计日志；一次漂移要能追到操作者与收敛结果。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
自动收敛会和人工应急操作打架。事故期间应有可审计的暂停机制，事后再把有效修复回写到声明式配置。
