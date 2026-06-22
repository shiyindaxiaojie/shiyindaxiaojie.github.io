---
title: Harbor 私有镜像仓库搭建
date: 2024-10-16
description: 由于自建机房无法访问 DockerHub，需要搭建 Harbor 私有镜像仓库，并解决研发团队在本地镜像仓库中拉取镜像的问题。
tags:
  - Harbor
  - 镜像仓库
  - 自建机房
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Harbor.png
---

# 背景

由于自建机房无法访问 DockerHub，需要搭建 Harbor 私有镜像仓库，并解决研发团队在本地镜像仓库中拉取镜像的问题。

# 部署

## Helm 部署 Harbor

本次基于 KubeSphere 平台搭建，使用 Helm 安装，从 [ArtifaceHub](https://artifacthub.io/) 搜索 Harbor，添加 [Helm Chart](https://artifacthub.io/packages/helm/harbor/harbor)。

```bash
export KUBECONFIG=/etc/kubernetes/admin.conf
helm repo add harbor https://helm.goharbor.io
```

Harbor 默认使用 DockerHub 镜像，可以在 Helm 模板添加 [m.daocloud.io](https://github.com/DaoCloud/public-image-mirror) 镜像仓库前缀，以解决拉取镜像失败的问题。代码片段如下：

```bash
# 存储类指定为 data-nfs-client，您可以自行选择其他存储类。
# Harbor 使用 Nginx 提供访问入口，此处设置为 http://10.2.2.109:30003
helm upgrade --install harbor harbor/harbor --set expose.type=nodePort --set persistence.persistentVolumeClaim.registry.storageClass=data-nfs-client --set persistence.persistentVolumeClaim.registry.accessMode=ReadWriteMany --set persistence.persistentVolumeClaim.registry.size=50Gi --set nginx.image.repository=m.daocloud.io/goharbor/nginx-photon --set portal.image.repository=m.daocloud.io/goharbor/harbor-portal --set core.image.repository=m.daocloud.io/goharbor/harbor-core --set jobservice.image.repository=m.daocloud.io/goharbor/harbor-jobservice --set registry.registry.image.repository=m.daocloud.io/goharbor/registry-photon --set registry.controller.image.repository=m.daocloud.io/goharbor/harbor-registryctl --set trivy.image.repository=m.daocloud.io/goharbor/trivy-adapter-photon --set database.internal.image.repository=m.daocloud.io/goharbor/harbor-db --set redis.internal.image.repository=m.daocloud.io/goharbor/redis-photon --set exporter.image.repository=m.daocloud.io/goharbor/harbor-exporter --set expose.tls.enabled=true --set externalURL=https://10.2.2.109:30003 --set expose.tls.auto.commonName="10.2.2.109"
```

验证 Harbor 登录。

```bash
echo "Harbor12345" | docker login 10.2.2.109:30003 -u "admin" --password-stdin
```

为方便内部访问，笔者没有配置自签名证书，如果您有这个需求，可以参考下述代码：

```bash
> cd certs
# 自签名 CA 证书
> openssl genrsa -out ca.key 4096
> openssl req -x509 -new -nodes -sha512 -days 3650 \
-subj "/C=CN/ST=Guangdong/L=Guangzhou/O=PUYI/OU=Personal/CN=harbor.mengxiangge.org" \
-key ca.key \
-out ca.crt
# 私钥证书
> openssl genrsa -out harbor.mengxiangge.org.key 4096
> openssl req -sha512 -new \
-subj "/C=CN/ST=Guangdong/L=Guangzhou/O=PUYI/OU=Personal/CN=harbor.mengxiangge.org" \
-key harbor.mengxiangge.org.key \
-out harbor.mengxiangge.org.csr

> cat > v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
 
[alt_names]
DNS.1=harbor.mengxiangge.org
EOF

# 生成证书
> openssl x509 -req -sha512 -days 3650 \
-extfile v3.ext \
-CA ca.crt -CAkey ca.key -CAcreateserial \
-in harbor.mengxiangge.org.csr \
-out harbor.mengxiangge.org.crt

# 提取证书
> openssl x509 -inform PEM -in harbor.mengxiangge.org.crt -out harbor.mengxiangge.org.cert

# 假设您使用的是 Docker 运行时，使用以下命令将 CA 证书复制到 Docker 配置目录中。
# Docker守护程序将.crt 文件解释为 CA证书，将 .cert 文件解释为客户端证书
> mkdir -p /etc/docker/certs.d/harbor.mengxiangge.org/
> cp harbor.mengxiangge.org.cert /etc/docker/certs.d/harbor.mengxiangge.org/
> cp harbor.mengxiangge.org.key /etc/docker/certs.d/harbor.mengxiangge.org/
> cp ca.crt /etc/docker/certs.d/harbor.mengxiangge.org/
```

## 容器运行时跳过验证

使用 HTTP 访问，需要调整对应的 Docker 和 Containerd 相关配置，如果您不清楚 Kubernetes 使用的是 containerd 还是 docker，可以使用 `kubectl get nodes -o wide` 查看关键信息是否携带 `containerd` 或者 `docker`。

```bash
> kubectl get nodes -o wide
NAME            STATUS   ROLES                  AGE     VERSION    INTERNAL-IP   EXTERNAL-IP   OS-IMAGE                KERNEL-VERSION                 CONTAINER-RUNTIME
k3s-master      Ready    control-plane,worker   3d23h   v1.24.17   10.2.2.109    <none>        CentOS Linux 7 (Core)   3.10.0-1160.119.1.el7.x86_64   containerd://1.6.33
k3s-worker-01   Ready    worker                 3d22h   v1.24.17   10.2.2.140    <none>        CentOS Linux 7 (Core)   3.10.0-1160.119.1.el7.x86_64   containerd://1.6.33
k3s-worker-02   Ready    worker                 3d22h   v1.24.17   10.2.2.211    <none>        CentOS Linux 7 (Core)   3.10.0-1160.119.1.el7.x86_64   containerd://1.6.33

# Docker
> vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://docker.m.daocloud.io"],
    "insecure-registries": ["10.2.2.109:30003"]
}
:wq
> sudo systemctl daemon-reload
> sudo systemctl restart docker

# Containerd
> vim /etc/containerd/config.toml

[plugins]
  [plugins."io.containerd.grpc.v1.cri"]
    ...
    [plugins."io.containerd.grpc.v1.cri".registry]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
          endpoint = ["https://docker.m.daocloud.io"]
        [plugins."io.containerd.grpc.v1.cri".registry.configs."10.2.2.109:30003".tls]
          insecure_skip_verify=true

> sudo systemctl daemon-reload
> sudo systemctl restart containerd
```

# 验证

访问 Harbor 控制台：http://10.2.2.109:30003。

输入初始用户 `admin` 和密码 `Harbor123451`，控制台登录成功界面如下。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/harbor/harbor-console.png)

验证镜像上传，本次使用 RocketMQ Dashboard 作为示例。

```bash
# 在有 VPN 的机器拉取 DockerHub 镜像
> docker pull apacherocketmq/rocketmq-dashboard:latest
# 推送到 Harbor 私有仓库
> echo "Harbor12345" | docker login 10.2.2.109:30003 -u "admin" --password-stdin
> docker tag apacherocketmq/rocketmq-dashboard:latest 10.2.2.109:30003/middleware/rocketmq-dashboard:1.0.0
> docker push 10.2.2.109:30003/middleware/rocketmq-dashboard:1.0.0
```

在 KubeSphere 中，在保密字典 Secret 添加 Harbor 私有仓库的认证信息，并设置默认镜像仓库。
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-default-registry-secret.png)

使用 Helm 一键部署，为 RocketMQ Dashboard 指定镜像地址。

```bash
helm upgrade --install rocketmq rocketmq/rocketmq -n mq --set clusterName=rocketmq --set image.tag=4.8.0 --set broker.size.master=2 --set broker.master.jvm.maxHeapSize=1024M --set broker.persistence.storageClass=data-nfs-client --set broker.size.replica=2 --set nameserver.jvm.maxHeapSize=1024M --set nameserver.persistence.enabled=false --set nameserver.persistence.storageClass=data-nfs-client --set dashboard.auth.users[0].name=admin --set dashboard.auth.users[0].password=admin123 --set dashboard.auth.users[1].name=mengxiangge --set dashboard.auth.users[1].password=admin123 --set dashboard.service.type=NodePort --set dashboard.service.nodePort=9877 --set proxy.enabled=false --set dashboard.image.repository="10.2.2.109:30003/middleware/rocketmq-dashboard"
```

查看容器事件，可以看到 rocketmq-dashboard 使用了我们定义的私有镜像地址。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-use-harbor-registry.png)
