---
title: Exploring VictoriaLogs for Log Storage Cost Optimization
date: 2024-01-01
description: Current issues with VictoriaLogs include
tags:
  - Cost Optimization
  - Log Search
  - VictoriaLogs
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/VictoriaMetrics.png
---

# Background

VictoriaLogs is an open-source project from [VictoriaMetrics](https://victoriametrics.com) for log storage and querying. Compared to Elasticsearch and Grafana Loki, VictoriaLogs offers lower costs in terms of storage space and memory usage. For more information, please refer to the [official documentation](https://docs.victoriametrics.com/VictoriaLogs).

# Deployment

According to the official deployment documentation, deploy using [Helm Chart](https://artifacthub.io/packages/helm/victoriametrics/victoria-logs-single). Note that `data-nfs-client` is the NFS storage class for the Kubernetes cluster. You can adjust it according to your actual situation.

```bash
helm repo add victoriametrics https://victoriametrics.github.io/helm-charts/
helm repo update
helm upgrade --install victoria-logs victoriametrics/victoria-logs-single -n logging --set nameOverride=victoria-logs --set server.persistentVolume.enabled=true --set server.persistentVolume.storageClassName=data-nfs-client --set server.service.type=NodePort --set server.service.nodePort=9428 --set dashboards.enabled=true
```

If you see `Error: chart requires kubeVersion: >=1.25.0-0 which is incompatible with Kubernetes v1.24.17`, it means your Kubernetes version is below 1.25.0. You can resolve this by lowering the Helm version by appending `--version 0.5.4` to the script.

The console interface is shown below.
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/victoriametrics/victoria-logs.png)

# Testing

> TODO

# Conclusion

Current issues with VictoriaLogs include:

1. Limited tokenization functionality - only simple searches are supported, unable to achieve various tokenization like Elasticsearch.
2. Current version does not support cluster deployment, only dual-write approach is available.
3. Official SDKs are not yet complete, requiring custom REST API implementation.
