---
id: go-backend-cloud-native-dev-example-1
title: "Go 服务放进 Kubernetes 后，优雅退出应该覆盖哪些步骤？"
slug: go-backend-cloud-native-dev-example-1
tracks:
  - go-backend
category: cloud-native-dev
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "云原生开发"
  - "优雅退出"
  - "容器化"
  - "生命周期"
summary: "围绕云原生开发的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Go 服务放进 Kubernetes 后，优雅退出应该覆盖哪些步骤？

::candidate level="core"::
收到 SIGTERM 后先把 readiness 置为失败，等待流量摘除，再停止接新请求、取消后台任务、完成有期限的在途请求，最后关闭连接。terminationGracePeriod 要覆盖真实耗时，超时后仍允许强制退出。

::interviewer::
这条云原生开发链路上线后，用什么证据验证设计？

::candidate level="deep"::
观察 Pod 生命周期、Endpoint 收敛、在途请求、退出日志和强杀次数；发布期间按版本切片错误率。

::interviewer::
云原生开发里最容易漏掉的失败分支是什么？

::candidate::
优雅退出依赖负载均衡收敛和客户端行为。长连接、消息消费和定时任务各有自己的排空协议，不能只处理 HTTP。
