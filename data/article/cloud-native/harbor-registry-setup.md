---
title: Harbor Private Registry Setup
date: 2024-10-16
description: Since on-premises data center cannot access DockerHub, we need to set up Harbor private registry and solve the problem of development team pulling ima...
tags:
  - Harbor
  - Image Registry
  - On-Premises
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Harbor.png
---

# Background

Since on-premises data center cannot access DockerHub, we need to set up Harbor private registry and solve the problem of development team pulling images from local registry.

# Deployment

## Helm Deploy Harbor

Based on KubeSphere platform, using Helm installation. Search Harbor from [ArtifactHub](https://artifacthub.io/) and add [Helm Chart](https://artifacthub.io/packages/helm/harbor/harbor).

```bash
export KUBECONFIG=/etc/kubernetes/admin.conf
helm repo add harbor https://helm.goharbor.io
```

Harbor defaults to DockerHub images. Add [m.daocloud.io](https://github.com/DaoCloud/public-image-mirror) registry prefix in Helm template to resolve image pull failures:

```bash
helm upgrade --install harbor harbor/harbor --set expose.type=nodePort --set persistence.persistentVolumeClaim.registry.storageClass=data-nfs-client --set persistence.persistentVolumeClaim.registry.accessMode=ReadWriteMany --set persistence.persistentVolumeClaim.registry.size=50Gi --set nginx.image.repository=m.daocloud.io/goharbor/nginx-photon ...
```

Verify Harbor login:

```bash
echo "Harbor12345" | docker login 10.2.2.109:30003 -u "admin" --password-stdin
```

For internal access, I didn't configure self-signed certificates. If needed, you can generate certificates using OpenSSL.

## Container Runtime Skip Verification

For HTTP access, adjust Docker and Containerd configurations. Check if Kubernetes uses containerd or docker:

```bash
> kubectl get nodes -o wide
NAME            STATUS   ROLES                  AGE     VERSION    CONTAINER-RUNTIME
k3s-master      Ready    control-plane,worker   3d23h   v1.24.17   containerd://1.6.33
```

```bash
# Docker
> vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://docker.m.daocloud.io"],
    "insecure-registries": ["10.2.2.109:30003"]
}
> sudo systemctl daemon-reload
> sudo systemctl restart docker

# Containerd
> vim /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".registry.configs."10.2.2.109:30003".tls]
  insecure_skip_verify=true
> sudo systemctl daemon-reload
> sudo systemctl restart containerd
```

# Verification

Access Harbor console: http://10.2.2.109:30003.

Enter initial user `admin` and password `Harbor12345`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/harbor/harbor-console.png)

Verify image upload using RocketMQ Dashboard:

```bash
# Pull from DockerHub on VPN machine
> docker pull apacherocketmq/rocketmq-dashboard:latest
# Push to Harbor private registry
> docker tag apacherocketmq/rocketmq-dashboard:latest 10.2.2.109:30003/middleware/rocketmq-dashboard:1.0.0
> docker push 10.2.2.109:30003/middleware/rocketmq-dashboard:1.0.0
```

In KubeSphere, add Harbor authentication in Secret and set default image registry.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-default-registry-secret.png)

Use Helm to deploy with specified image address.
