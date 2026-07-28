---
id: go-backend-cloud-native-dev-example-2
title: "你做过的云原生改造，怎样避免应用只会在本机正常？"
slug: go-backend-cloud-native-dev-example-2
tracks:
  - go-backend
category: cloud-native-dev
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "云原生开发"
  - "优雅退出"
  - "容器化"
  - "生命周期"
summary: "围绕云原生开发的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
你做过的云原生改造，怎样避免应用只会在本机正常？

::candidate level="deep"::
配置、日志、健康检查、资源限制和临时文件都要按容器环境设计；依赖通过 DNS 与身份访问，不能写死节点。再用本地容器、集成环境和故障注入验证启动、重启与扩缩容。

::interviewer::
这项云原生开发设计怎么证明不是纸上方案？

::candidate level="deep"::
观察 Pod 生命周期、Endpoint 收敛、在途请求、退出日志和强杀次数；发布期间按版本切片错误率。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
优雅退出依赖负载均衡收敛和客户端行为。长连接、消息消费和定时任务各有自己的排空协议，不能只处理 HTTP。
