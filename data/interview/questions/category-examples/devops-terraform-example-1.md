---
id: devops-terraform-example-1
title: "Terraform State 为什么要远端存储并加锁？"
slug: devops-terraform-example-1
tracks:
  - devops
category: terraform
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Terraform"
  - "Terraform State"
  - "配置漂移"
  - "IaC"
summary: "围绕Terraform的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Terraform State 为什么要远端存储并加锁？

::candidate level="core"::
State 保存的是配置与真实资源之间的映射，也可能含敏感属性。放在本地会让多人并发修改产生分叉，远端存储解决共享和版本化，锁解决同一时刻只有一次写入；它们仍替代不了最小权限和备份。

::interviewer::
别停在原理上，Terraform落到线上先看什么证据？

::candidate level="deep"::
核对 State 版本、锁记录、云审计日志和 plan 输出，尤其关注 force replacement 与 destroy；高风险 apply 前保留可恢复的 State 快照。

::interviewer::
Terraform这套判断在哪个边界下会失效？

::candidate::
State 锁只能防 Terraform 客户端并发，防不了控制台人工修改和其他 IaC 工具。漂移检测、权限收口与变更审计缺一不可。
