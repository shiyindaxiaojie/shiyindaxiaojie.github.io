---
title: Rainbond 云原生应用平台搭建
date: 2024-01-01
description: 由于 KubeSphere 宣布开源版停止下载和支持，笔者刚好在搭建机房环境，准备调研 Rainbond 搭建 Kubernetes 集群。
tags:
  - Kubernetes
  - Rainbond
  - 自建机房
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Rainbond.png
---

# 背景介绍

由于 KubeSphere 宣布开源版停止下载和支持，笔者刚好在搭建机房环境，准备调研 Rainbond 搭建 Kubernetes 集群。

# 准备工作

由于笔者的服务器还没有 Kubernetes 环境，临时使用一台机器 10.105.128.173 部署 Rainbond 平台，然后在其他服务器搭建 Kubernete 集群。

以下 4 台机器节点用于部署 Kubernetes 集群：
* 10.105.128.238：控制节点和 etcd
* 10.105.129.79 ：数据节点1
* 10.105.129.142：数据节点2
* 10.105.129.174：数据节点3

在每台服务器执行以下操作。

```bash
# 设置域名解析
cat /etc/hosts
10.105.128.238  k8s-master     
10.105.129.79   k8s-worker1
10.105.129.142  k8s-worker2
10.105.129.174  k8s-worker3

# 关闭防火墙
systemctl stop firewalld
systemctl disable firewalld
iptables -F && iptables -t nat -F && iptables -t mangle -F && iptables -X

# 关闭SELinux
setenforce 0
sed -i 's/enforcing/disabled/' /etc/selinux/config

# 关闭Swap
swapoff -a
sed -ri 's/.*swap.*/#&/' /etc/fstab

# 调整内核参数
cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
sysctl --system

# 在初始化 K8s 集群节点时，rainbond 添加节点会读取这个目录，需要提前创建
mkdir -p /run/k3s/containerd
chmod 777 -R /run/k3s/containerd

# 安装 Docker
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker.service
vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://m.daocloud.io"]
}
systemctl daemon-reload
systemctl start docker.service
systemctl status -l docker.service
```

## 安装 Rainbond 平台

使用 Rainbond 快速安装脚本

```bash
curl -o install.sh https://get.rainbond.com && bash ./install.sh
```

等待 3-5 分钟，使用浏览器访问 http://10.105.128.238:7070 进入 Rainbond。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/rainbond/add-node-to-kubernetes.png)





1. 基于 Rainbond 在其他服务器搭建 Kubernete 集群



## 创建 Kubernetes 集群

、

## 添加 Kubernetes 节点

https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/rainbond/add-node-to-kubernetes.png

在目标节点服务器执行以下命令（示例）

```bash
curl -sfL http://10.105.128.238:7070/install-cluster.sh | sh -s - --rbd-url http://10.105.128.238:7070  --worker  --token  2d4707be2f6b4858b9bd0c9dc0b27c0a --mirror cn
```

如果控制台显示节点状态为 `NotReady`，可能是 iptables 规则冲突。执行以下命令，清除所有现有的规则链和自定义链，将网络表恢复到初始状态。

```bash
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -t mangle -F
sudo iptables -X
sudo iptables -t nat -X
sudo iptables -t mangle -X

sudo ip6tables -F
sudo ip6tables -t nat -F
sudo ip6tables -t mangle -F
sudo ip6tables -X
sudo ip6tables -t nat -X
sudo ip6tables -t mangle -X
```

然后重启 `RKE2 Agent` 服务。

```bash
systemctl restart rke2-agent
```

检查节点的状态，节点的状态会从 `NotReady` 变为 `Ready`。

## 修改 containerd 配置



```bash
vim /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.configs]
    [plugins."io.containerd.grpc.v1.cri".registry.configs."10.105.128.128:30003"]
      [plugins."io.containerd.grpc.v1.cri".registry.configs."10.105.128.128:30003".tls]
        insecure_skip_verify = true
```