---
id: cloud-native-gitops-example-1
title: "GitOps 为什么强调声明式配置和持续收敛？"
slug: cloud-native-gitops-example-1
tracks:
  - cloud-native
category: gitops
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "GitOps"
  - "声明式交付"
  - "状态漂移"
  - "Argo CD 同步"
summary: "围绕GitOps的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
GitOps 为什么强调声明式配置和持续收敛？

::candidate level="core"::
Git 仓库保存期望状态，控制器不断比较并收敛实际状态。这样变更可以审查、回滚和审计，也能发现手工修改；但密钥、运行数据和紧急处置不应简单塞进 Git。

::interviewer::
别停在原理上，GitOps落到线上先看什么证据？

::candidate level="deep"::
证据来自 Git 提交、同步记录、资源 diff、健康状态和 Kubernetes 审计日志；一次漂移要能追到操作者与收敛结果。

::interviewer::
GitOps这套判断在哪个边界下会失效？

::candidate::
自动收敛会和人工应急操作打架。事故期间应有可审计的暂停机制，事后再把有效修复回写到声明式配置。
