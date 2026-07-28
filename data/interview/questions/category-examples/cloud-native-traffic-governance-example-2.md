---
id: cloud-native-traffic-governance-example-2
title: "流量灰度时，怎么避免同一用户在新旧版本之间来回跳？"
slug: cloud-native-traffic-governance-example-2
tracks:
  - cloud-native
category: traffic-governance
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "流量治理"
  - "超时重试"
  - "熔断限流"
  - "灰度路由"
summary: "围绕流量治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
流量灰度时，怎么避免同一用户在新旧版本之间来回跳？

::candidate level="deep"::
选择稳定的分流键，例如用户、租户或请求头，并让网关、服务和异步链路都能传递版本上下文。会话状态与缓存也要兼容；仅按实例随机分流无法验证完整用户路径。

::interviewer::
如果现场验证这项流量治理判断，先看哪些指标或日志？

::candidate level="deep"::
看每一跳超时、重试次数、熔断状态、限流拒绝和版本切片指标，Trace 要能显示一次请求实际被放大了多少次。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
非幂等请求不能无条件重试，限流也不能只保护入口。最脆弱的下游和共享资源才决定整条链路的边界。
