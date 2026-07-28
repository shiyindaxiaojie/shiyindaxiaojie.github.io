---
id: devops-terraform-example-2
title: "terraform plan 发现生产漂移，什么时候 import，什么时候回滚？"
slug: devops-terraform-example-2
tracks:
  - devops
category: terraform
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Terraform"
  - "Terraform State"
  - "配置漂移"
  - "IaC"
summary: "围绕Terraform的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
terraform plan 发现生产漂移，什么时候 import，什么时候回滚？

::candidate level="deep"::
先判断漂移来源：紧急人工变更若已成为期望状态，应把配置补齐并 import 或 refresh；未经授权且风险明确的改动可以按代码回滚。不能直接 apply 抹平差异，先看 plan 是否包含替换、删除和跨资源级联。

::interviewer::
如果现场现象和预期不一致，Terraform怎么继续缩小范围？

::candidate level="deep"::
核对 State 版本、锁记录、云审计日志和 plan 输出，尤其关注 force replacement 与 destroy；高风险 apply 前保留可恢复的 State 快照。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
State 锁只能防 Terraform 客户端并发，防不了控制台人工修改和其他 IaC 工具。漂移检测、权限收口与变更审计缺一不可。
