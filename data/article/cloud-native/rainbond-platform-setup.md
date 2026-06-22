---
title: Rainbond Cloud Native Platform Setup
date: 2024-01-01
description: Since KubeSphere announced that the open-source version would stop downloading and support, I happened to be setting up a datacenter environment, so I...
tags:
  - Kubernetes
  - Rainbond
  - Self-hosted Datacenter
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Rainbond.png
---

# Background

Since KubeSphere announced that the open-source version would stop downloading and support, I happened to be setting up a datacenter environment, so I prepared to investigate Rainbond to build a Kubernetes cluster.

# Preparation

Since my servers do not have a Kubernetes environment yet, I temporarily use a machine 10.105.128.173 to deploy the Rainbond platform, and then build a Kubernetes cluster on other servers.

The following 4 machine nodes are used to deploy the Kubernetes cluster:

- 10.105.128.238: Control node and etcd
- 10.105.129.79 : Data node 1
- 10.105.129.142: Data node 2
- 10.105.129.174: Data node 3

Execute the following operations on each server.

```bash
# Set domain name resolution
cat /etc/hosts
10.105.128.238  k8s-master
10.105.129.79   k8s-worker1
10.105.129.142  k8s-worker2
10.105.129.174  k8s-worker3

# Stop firewall
systemctl stop firewalld
systemctl disable firewalld
iptables -F && iptables -t nat -F && iptables -t mangle -F && iptables -X

# Disable SELinux
setenforce 0
sed -i 's/enforcing/disabled/' /etc/selinux/config

# Disable Swap
swapoff -a
sed -ri 's/.*swap.*/#&/' /etc/fstab

# Adjust kernel parameters
cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
sysctl --system

# When initializing the K8s cluster node, rainbond adding a node will read this directory, so it needs to be created in advance
mkdir -p /run/k3s/containerd
chmod 777 -R /run/k3s/containerd

# Install Docker
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

## Install Rainbond Platform

Use the Rainbond quick installation script

```bash
curl -o install.sh https://get.rainbond.com && bash ./install.sh
```

Wait 3-5 minutes, and use a browser to visit http://10.105.128.238:7070 to enter Rainbond.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/rainbond/add-node-to-kubernetes.png)

1. Build a Kubernetes cluster on other servers based on Rainbond

## Create Kubernetes Cluster

、

## Add Kubernetes Node

https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/rainbond/add-node-to-kubernetes.png

Execute the following command on the target node server (example)

```bash
curl -sfL http://10.105.128.238:7070/install-cluster.sh | sh -s - --rbd-url http://10.105.128.238:7070  --worker  --token  2d4707be2f6b4858b9bd0c9dc0b27c0a --mirror cn
```

If the console shows the node status as `NotReady`, it may be an iptables rule conflict. Execute the following commands to clear all existing rule chains and custom chains, and restore the network table to its initial state.

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

Then restart the `RKE2 Agent` service.

```bash
systemctl restart rke2-agent
```

Check the status of the node, the status of the node will change from `NotReady` to `Ready`.

## Modify containerd configuration

```bash
vim /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.configs]
    [plugins."io.containerd.grpc.v1.cri".registry.configs."10.105.128.128:30003"]
      [plugins."io.containerd.grpc.v1.cri".registry.configs."10.105.128.128:30003".tls]
        insecure_skip_verify = true
```
