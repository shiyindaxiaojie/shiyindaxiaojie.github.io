---
title: APISIX 金丝雀发布实践
date: 2023-08-16
description: 在引入 APISIX 云原生网关后，我们替换了 Nginx，解决了 Nginx reload 的网络抖动问题，并且可以很方便的实现 A/B 测试、金丝雀发布等场景。
tags:
  - APISIX
  - 云原生网关
  - A/B 测试
  - 金丝雀发布
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/APISIX.png
---

# 背景

Apache APISIX 是 Apache 软件基金会下的云原生 API 网关，由 API7.ai 开发并捐赠，基于 NGINX + ngx_lua 构建，提供了动态路由、动态上游、动态证书、A/B 测试、灰度发布（金丝雀发布）、蓝绿部署、限速、防攻击、收集指标、监控报警、可观测、服务治理等功能。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-architect.png)

具体的介绍可以查阅 [APISIX 文档](https://apisix.apache.org/zh/docs/apisix/getting-started/README/)。

由于 Nginx reload 存在网络抖动，并且随着业务路由增加，nginx 配置维护十分困难。根据 APISIX 的官方介绍，这些问题得到解决。因此，我们尝试引入 APISIX 作为云原生网关，实现 A/B 测试、金丝雀发布等功能。

# 目标

引入 APISIX 代替 Nginx 网关，简化生产运维操作。

# 部署

为方便维护，使用官方提供的 Helm 脚本部署 APISIX 网关，代码片段如下。

```bash
helm repo add apisix https://charts.apiseven.com
helm repo update
helm install apisix apisix/apisix --create-namespace  --namespace apisix
```

在 KubeSphere 查看已部署的工作负载，可以看到 APISIX 分别创建了 `apisix` 访问入口、`apisix-dashboard` 控制台和 `apisix-ingress-controller` 控制器。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-deployment.png)

调整 `apisix` 网关的服务端口为 80，`apisix-dashboard` 控制台的服务端口为 9000，初始用户密码为 `admin/admin`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-dashboard.png)

# 配置

> 本文只讲解最基本的配置流程，不涉及域名和证书的配置步骤。

## 配置上游

假设创建一个名为 `eden-demo-cola` 的上游。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-upstream.png)

## 配置服务

添加 `eden-demo-cola` 服务，并绑定已创建的上游。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-service.png)

## 配置路由

假设请求入口为 `/api/auth`，参考下图，配置为路由 A。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-router.png)

如果你的上游服务访问入口为 `/auth`，可以通过重写请求路径的方式，将 `/api/auth` 重写为 `/auth`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-rewrite-router.png)

## 验证 A/B 测试

保存上述创建好的路由 A，当客户端不携带任何请求头时，默认访问路由 A。

添加新的路由 B，设置 HTTP 请求头来控制是否接收请求，例如 `region=gz` 或者 `region=sz`，当客户端携带这些请求头，将访问路由 B。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-router-by-header.png)

使用 curl 命令，模拟请求，查看路由的请求情况。

```bash
curl --request GET http://10.2.2.109/api/auth

路由A
路由A
路由A
路由A

curl --request GET http://10.2.2.109/api/auth --header 'region: gz'

路由B
路由B
路由B
路由B
```

## 验证金丝雀发布

APISIX 控制台在配置上游时，提供了权重控制选项，您可以添加多个节点来实现金丝雀发布。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-update-upstream-weight.png)

使用 curl 命令，模拟请求，查看路由的请求情况。

```bash
> curl --request GET http://10.2.2.109/api/auth

路由A
路由A
路由A
路由C
路由A
路由C
路由C
路由C
```

# 总结

在引入 APISIX 云原生网关后，我们替换了 Nginx，解决了 Nginx reload 的网络抖动问题，并且可以很方便的实现 A/B 测试、金丝雀发布等场景。

本文并没有探讨 APISIX Ingress Controller 的使用，因为 APISIX Dashboard 本身的功能已经足够满足我们的需求。
