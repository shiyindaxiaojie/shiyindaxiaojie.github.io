---
id: cloud-native-cicd-example-2
title: "镜像已经通过测试，为什么进集群前还要做策略校验？"
slug: cloud-native-cicd-example-2
tracks:
  - cloud-native
category: cicd
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "云原生 CI/CD"
  - "滚动发布"
  - "准入策略"
  - "镜像签名"
summary: "围绕云原生 CI/CD的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
镜像已经通过测试，为什么进集群前还要做策略校验？

::candidate level="deep"::
测试证明的是已覆盖场景，策略校验约束的是供应链和运行边界，例如签名、来源、漏洞等级、特权、hostPath 和资源限制。它能在部署前拒绝不合规对象，并留下统一审计。

::interviewer::
如果现场现象和预期不一致，云原生 CI/CD怎么继续缩小范围？

::candidate level="deep"::
把 Deployment revision、镜像 digest、准入拒绝记录、Pod 状态和版本切片 SLI 串起来，才能解释发布为什么停。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
策略过严会让紧急恢复也被拦住。需要有时限明确、全程审计的 break-glass 通道，并在事后补回策略检查。
