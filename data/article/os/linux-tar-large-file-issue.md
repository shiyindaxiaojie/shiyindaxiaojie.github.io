---
title: Production Incident Caused by tar on a Large Sparse File
date: 2023-06-15
description: After ruling out the network, the periodic pattern suggested a background process was running on a schedule and impacting multiple K8s clusters.
tags:
  - Linux
  - Sparse File
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Linux.png
---

# Problem

Several systems in our production environment showed strange behavior: brief errors or request timeouts occurred every night after 21:00.

For example, System A triggered a WeChat alert around 21:00, reporting API access exceptions.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfs-wechat-alarm.png)

System B triggered a DingTalk alert around 21:00, reporting gateway probe anomalies.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfs-dingtalk-alarm.png)

At first we suspected database, code changes, xxl-job, etc., but we quickly ruled these out:
1. The systems were deployed independently on Tencent Cloud EKS elastic clusters, with no interference.
2. Each system used separate databases and xxljob instances.
3. We also ruled out recent code changes by rolling back and verifying.

# Root Cause Analysis

After organizing the timeline, we found the failures were triggered almost at the same time across multiple systems:

| Time Range | System A (WeChat Alert) | System B (DingTalk Alert) | Other Systems |
| --- | --- | --- | --- |
| 2023-03-15 20:58-21:00 | 20:59:13 reported 499 access error | 21:03 APISIX probe anomaly | ... |
| 2023-03-16 21:03-21:06 | 21:03:04 reported 499 access error | 21:03 APISIX probe anomaly | ... |
| 2023-03-20 21:19-21:23 | 21:19:34 reported 499 access error | 21:20 APISIX probe anomaly | ... |
| 2023-03-21 21:43-21:45 | 21:41:50 reported 499 access error | 21:43 APISIX probe anomaly | ... |

## Network issue?

The network path of one of our systems can be simplified as:

User -> Tencent Cloud CLB -> Tencent Cloud EKS containers (K8s Service) -> Nginx (Pod) -> API Gateway (Pod) -> Business Services (Pods)

We started from the entry point. For `2023-03-21`, the CLB traffic monitoring showed an inbound packet rate of 39/s at `21:42`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/clb-monitoring-network-before.png)

At `21:44`, the inbound packet rate dropped to 9/s and traffic decreased.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/clb-monitoring-network-after.png)

Checking the Nginx access logs, we found 4,434 errors with status code 499.

```bash
[root]# egrep "2023-03-21T21:4[0-9]" access.log | grep -w 499 | wc -1
4434
```

Status code 499 means the upstream service responded too slowly, so the client (WeChat) closed the connection and triggered an alert.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfs-nginx-499.png)

We checked the upstream services and did not find any errors.

We suspected that Tencent Cloud might have done a network change recently, so we contacted Tencent Cloud for investigation. We agreed on the following plan:
1. Tencent Cloud monitors containers and network.
2. Our ops team collects unreachable Pods and runs PING scripts.
3. Our dev team sends large volumes of requests using Apifox to detect anomalies.

Since the ops script workflow had too many steps, to improve monitoring efficiency we imported those scripts into blackbox-exporter and visualized them in Grafana. Example configuration:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
  
rule_files:
  - /etc/prometheus/rules/*.rules
  
scrape_configs:
  - job_name: "blackbox-ping"
    scrape_interval: 5s
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
    # Hosts to probe (unreachable targets)
    - targets: ['172.28.12.1','172.28.12.2','...']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: 'blackbox-tcp'
    scrape_interval: 5s
    metrics_path: /probe
    params:
      module: [tcp_connect]
    static_configs:
    - targets: ['172.28.12.101:2181','172.28.12.102:2181','...'] 
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: 'blackbox-http'
    scrape_interval: 5s
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
    - targets: ['http://172.28.20.1:9091/apisix/prometheus/metrics', '...']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

Our active test traffic did not show any anomalies. After 21:30, when we stopped simulating requests, the issue reappeared. Tencent Cloud confirmed their network was normal, and our Grafana monitoring also indicated the network was healthy.

## A suspicious background process?

After ruling out the network, the periodic pattern suggested a background process was running on a schedule and impacting multiple K8s clusters.

Since these systems run on Tencent Cloud `EKS` elastic clusters and the worker nodes are maintained by Tencent Cloud, we asked them to check the cluster nodes, but they still couldn’t find the cause.

In our internal postmortem, we noticed the incident happened around the same time every other day, which looked like a scheduled task. Could it be something Tencent scheduled? Our xxljob? Or a cron job on a server?

We had overlooked Linux cron jobs. After reviewing cron scripts on our servers, we found a log cleanup script that could hang. It ran every day at 4 AM, and the problematic snippet looked like this:

```bash
# Compress kafka-consumer console output file
tar czf kafka-consumer_${today}.tar.gz kafka-consumer.out
# Reset the file content after compression
echo "-------${today} New Log-------" > kafka-consumer.out
```

The log files were mounted to our ops server via Tencent Cloud `CFS` (Cloud File Storage). The ops server ran this cleanup script to read/write those log files, as shown below.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfg-hang-io-from-tar-spare.png)

Tencent Cloud optimizes `CFS` allocation efficiency using sparse files. Although we only wrote about `5GB` per day to `kafka-consumer.out`, `CFS` pre-allocated `100GB` or even more due to the sparse-file mechanism.

As a result, the `tar` command couldn’t correctly handle the sparse file and tried to compress it based on the sparse file’s reported logical size, which caused the CFS host I/O to stall. Components from systems A, B, and C were mounted to the same CFS path, leading to a cascading failure.

A simple experiment with `ls` and `du` illustrates the difference:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfg-du-ls.png)

We only wrote `1.5M`, but the sparse file appeared as `716G`. This is because `ls` shows the *logical* size, while `du` shows the *physical* blocks used.

For the cloud provider, sparse files are cost-efficient: physical storage is only consumed when data is actually written.

# Mitigation

Once the root cause was confirmed, we agreed on the following actions.

Tencent Cloud: the same CFS path was not truly isolated physically, and users were not informed about limitations on the number of CFS volumes, so sharing was used. Since this issue couldn’t be avoided with a shared CFS, we requested more CFS volumes so each system could mount its own volume to achieve physical isolation.

Our side: fix the log cleanup script by removing the `tar` step (to avoid mis-handling sparse files), add logging and email monitoring, and reduce excessive console logging at the application layer.
