---
title: 探索 VictoriaLogs 优化日志存储成本
date: 2024-01-01
description: VictoriaLogs 是属于 VictoriaMetrics 的开源项目，用于日志存储和查询。
tags:
  - 成本优化
  - 日志检索
  - VictoriaLogs
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/VictoriaMetrics.png
---

# 背景

VictoriaLogs 是属于 [VictoriaMetrics](https://victoriametrics.com) 的开源项目，用于日志存储和查询。相对 Elasticsearch 和 Grafana Loki，VictoriaLogs 在存储空间和内存占用的成本更低。相关介绍说明可以查阅[官网](https://docs.victoriametrics.com/VictoriaLogs)。

# 部署

根据官网的部署文档，使用 [Helm Chart](https://artifacthub.io/packages/helm/victoriametrics/victoria-logs-single) 部署。请注意，`data-nfs-client` 是部署 Kubernetes 集群的 NFS 存储类，您可以根据实际情况调整。

```bash
helm repo add victoriametrics https://victoriametrics.github.io/helm-charts/
helm repo update
helm upgrade --install victoria-logs victoriametrics/victoria-logs-single -n logging --set nameOverride=victoria-logs --set server.persistentVolume.enabled=true --set server.persistentVolume.storageClassName=data-nfs-client --set server.service.type=NodePort --set server.service.nodePort=9428 --set dashboards.enabled=true
```

如果提示 `Error: chart requires kubeVersion: >=1.25.0-0 which is incompatible with Kubernetes v1.24.17`，表示您的 Kubernetes 版本低于 1.25.0，可以降低下 Helm 版本，在脚本追加 `--version 0.5.4` 解决。

控制台界面如下。
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/victoriametrics/victoria-logs.png)

# 测试

> TODO

# 结论

VictoriaLogs 目前存在的问题有：

1. 提供的分词功能有限，只能做简单的搜索，无法做到类似于 ES 的各种分词。
2. 当前版本不支持集群部署，只能通过双写的形式实现。
3. 官方的 SDK 还不完善，只能自行编写 REST API 实现。
