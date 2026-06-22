---
title: Linux 执行 tar 命令处理大文件引发线上问题
date: 2023-06-15
description: 最近我们生产环境的几个系统出现了很诡异的现象，每天晚上 21 点之后出现短暂的报错，或者响应超时。
tags:
  - Linux
  - 稀疏文件
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Linux.png
---

# 问题描述

最近我们生产环境的几个系统出现了很诡异的现象，每天晚上 21 点之后出现短暂的报错，或者响应超时。

例如，系统 A 在 21 点弹出微信预警，提示接口访问异常。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfs-wechat-alarm.png)

系统 B 在 21 点弹出钉钉预警，提示网关探测异常。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfs-dingtalk-alarm.png)

一开始我们怀疑是数据库、代码、xxl-job 等问题，但是这些想法很快就否决了。
1. 各系统分别独立部署在腾讯云的 EKS 弹性集群，互不干扰。
2. 各系统使用的数据库和 xxljob 都是分开的。
3. 我们通过回退代码版本检查，也排除了这些系统近期的代码更新问题。

# 原因分析

经过时间线整理，各系统发生故障的时间点基本是同时触发的，如下。

| 时间范围 | 系统A 微信预警 | 系统B 钉钉预警 | 其他系统 |
| --- | --- | --- | --- |
| 2023-03-15 20:58-21:00 | 20:59:13 推送 499 访问异常 | 21:03 提示 APISIX 探测异常 | ... |
| 2023-03-16 21:03-21:06 | 21:03:04 推送 499 访问异常 | 21:03 提示 APISIX 探测异常 | ... |
| 2023-03-20 21:19-21:23 | 21:19:34 推送 499 访问异常 | 21:20 提示 APISIX 探测异常 | ... |
| 2023-03-21 21:43-21:45 | 21:41:50 推送 499 访问异常 | 21:43 提示 APISIX 探测异常 | ... |

## 网络故障？

我们某个系统的网络链路，可以简化如下。

用户访问 -> 腾讯云CLB -> 腾讯云EKS容器（K8s Service）-> Nginx（Pod） -> 业务网关（Pod）-> 业务服务集（Pod）

首先从入口检查，腾讯云负载均衡 CLB 当时的流量监控如下，以 `2023-03-21` 的监控数据为例，当时 `21:42` 的入包量为 39 个/秒。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/clb-monitoring-network-before.png)

到了 `21:44`，入包量为 9 个/秒，请求变少了。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/clb-monitoring-network-after.png)

往后一层检查 Nginx 的访问日志，得到 4434 条状态码为 499 的报错条数。

```bash
[root]# egrep "2023-03-21T21:4[0-9]" access.log | grep -w 499 | wc -1
4434
```

499 错误码表示 Nginx 的上游 upstream 服务端响应太慢了，微信（客户端）主动断开了连接，然后推送了相关预警。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfs-nginx-499.png)

我们检查了 Nginx 的上游服务，并没有发现任何报错。

不得不怀疑是不是腾讯云网络近期做了网络调整导致，我们联系了腾讯云团队协助检查。腾讯方的技术团队和我们制定了如下策略：
1. 腾讯方负责监控容器、网络问题。
2. 我方运维团队负责收集网络不通的 Pod ，通过脚本进行 PING 操作。
3. 我方研发团队通过 Apifox 发起大量请求，查看持续请求是否出现异常。

由于运维脚本额操作的步骤太多，为了提高监控效率，笔者将运维脚本导入到 blackbox-exporter 监控，并展示到 Grafana 查看。代码片段如下。

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
    # 网络不通的机器
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

我们主动发起的请求，并没有出现任何异常。等到了 21:30 之后，我们不再模拟请求，故障又出现了，但是，腾讯方反馈，他们的网络是正常的。我们在 Grafana 监控也证实网络是正常的。

## 可疑后台进程？

排除网络问题，因为这些故障看起来是周期性的，感觉就像有一个后台进程定时执行某些工作，同时对这几个 K8s 集群造成了影响。

因为系统使用的是腾讯云 `EKS` 弹性集群，机器节点由腾讯方团队负责维护，我们让腾讯云协助检查我们使用的 K8s 集群节点，他们还是没找到原因。

我们内部做了复盘，回头看看事故的时间点，每隔一天同一时段发生一次，像是定时任务做了什么操作导致。有可能是 腾讯做了什么定时任务？我们的 xxljob？服务器上的定时任务？

好像算漏了 Linux 定时任务。经过盘点各服务器的定时脚本，发现有个 Linux 过期日志清理脚本执行卡死。这个脚本每天凌晨 4 点执行日志清理，发生问题的代码片段如下。

```bash
# 对 kafka-consumer 控制台输入的 out 文件压缩处理
tar czf kafka-consumer_${today}.tar.gz kafka-consumer.out
# 在压缩完成后通过 echo 重置内容
echo "-------${today} New Log-------" > kafka-consumer.out
```

日志文件通过腾讯云 `CFS` 文件系统挂载到我们的运维服务器，运维服务器运行这个清洗脚本对日志文件执行读写操作，如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfg-hang-io-from-tar-spare.png)

腾讯云对 `CFS` 做了存储效率优化，为了提高存储资源申请的分配效率，采用稀疏文件的方式，我们写入 `kafka-consumer.out` 每天大概就 `5GB`，`CFS` 通过稀疏文件机制预占了 `100 GB`，甚至更多。

结果，脚本内的 `tar` 命令无法识别 spare 稀疏文件，按照稀疏文件给出的大小进行压缩，导致整个 CFS 的宿主机 IO 僵死。我们的系统 A、系统 B、系统 C 部分组件挂载了该 CFS 路径，产生了连锁故障。

做个实验，执行 ls 和 du 命令，如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfg-du-ls.png)

可以看到，我们只写入了 `1.5M` 的大小，结果在稀疏文件表现为 `716G` 。这是因为 `ls` 命令查到的是文件逻辑上占用的空间，而 `du` 命令查到的是文件物理上占用的块大小。

对于腾讯来说，如果使用稀疏文件来作为虚拟硬盘文件，那么只有当虚拟机实际写入数据时，才会消耗宿主机的存储空间，有利于他们的成本控制。

# 解决方案

责任已经明确，相应的解决方案如下。

腾讯方：同一个 CFS 路径没有做到真正的物理隔离，没有告知用户，用户在使用 CFS 的个数是有限制的，当时的做法只能共用。既然 CFS 解决不了这个问题，那就和腾讯申请更多的 CFS 盘，每套系统单独挂载，做到物理隔离。

我方：日志脚本有问题，去除 tar 命令，以防误读稀疏文件，并增加日志，邮件监控，应用层尽可能避免大量的控制台日志打印。


