---
title: Higress 金丝雀发布实践
date: 2024-03-16
description: 在引入 Higress 云原生网关后，我们去除了 Spring Cloud Gateway，并且可以很方便的实现 A/B 测试、金丝雀发布等场景。
tags:
  - Higress
  - A/B 测试
  - 金丝雀发布
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Higress.png
---

# 背景

Higress 是阿里巴巴开源的云原生网关，基于 Istio + Envoy 为核心构建，实现了流量网关 + 微服务网关 + 安全网关三合一的高集成能力，深度集成 Dubbo、Nacos、Sentinel 等微服务技术栈。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-all-in-one.png)

关于 Higress 具体的介绍，您可以查阅 [Higress 文档](https://higress.cn/docs/latest/overview/what-is-higress)。

在早期的部署架构，业务通常采用 `WAF 安全防护网关` + `Nginx 流量网关` + `Spring Cloud Gateway 微服务网关` 实现。

一次用户请求 -> LB（WAF） -> Nginx -> Spring Cloud Gateway -> 微服务

这样导致在链路分析和日常维护上带来复杂性。因此，我们尝试引入 Higress 网关，去除 Spring Cloud Gateway 的依赖，将请求链缩短如下。

一次用户请求 -> LB（WAF） -> Higress -> 微服务

# 目标

验证 Higress 网关能否替换 Spring Cloud Gateway，并实现 A/B 测试、金丝雀发布等功能。

# 部署

为方便维护，使用 Helm 部署 Higress 网关，代码片段如下。

```bash
helm install higress --create-namespace --namespace higress higress.io/higress
```

在 KubeSphere 查看已部署的工作负载，可以看到 Higress 分别创建了 `higress-gateway` 访问入口、`higress-console` 控制台和 `higress-controller` 控制器。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-deployment.png)

调整 `higress-gateway` 控制台的服务端口为 80，对外统一访问这个端口。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-service.png)

调整 `higress-console` 控制台的服务端口为 8080，初始用户密码为 `admin/admin`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-console.png)

# 使用

> 本文只讲解最基本的配置流程，不涉及域名和证书的配置步骤。

## 配置服务来源

Higress 支持 `Nacos`、`Eureka`、`Consul`、`Zookeeper` 等服务注册中心接入。

例如，下图使用 Nacos 2.x 版本配置。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-register-nacos2.png)

查看服务列表，选择命名空间为 `mcp`，过滤出注册中心的服务。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-register-list.png)

## 配置路由列表

假设请求入口为 `/api/auth`，参考下图，配置为路由 A。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-canary-none.png)

如果实际的请求入口为 `/demo/api/auth`，期望后端请求到 `/api/auth`，则需要设置重写策略。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-rewrite-router.png)

Higress 允许您添加多个路由，用于平替 `Spring Cloud Gateway` 的 API 路由策略。

## 验证 A/B 测试

Higress 通过注解 `higress.io/canary` 实现蓝绿发布、A/B 测试、金丝雀发布。

首先，保留上述配置的路由 A ，当请求不携带任何 Header、Cookies 时，默认请求到这个路由。

添加一个新的路由 B，使用 `higress.io/canary-by-header` 来控制。如下图，我们配置了 `higress.io/canary-by-header=region` 和 `higress.io/canary-by-header-value=gz|bj`，当客户端在 HTTP 请求头中携带 `region` 参数值 `gz` 或 `bj` 时，将请求路由到路由 B，否则路由到原来的路由 A。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-canary-header.png)

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

实现金丝雀发布场景，使用 `higress.io/canary-weight` 权重来控制，您可以参考下图，添加路由 C ，权重慢慢从 20 到 80，分流原来的路由 A。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-canary-weight.png)

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

在引入 Higress 云原生网关后，我们去除了 `Spring Cloud Gateway`，并且可以很方便的实现 A/B 测试、金丝雀发布等场景。但是，目前的版本相对 APISIX 来说，存在一些不足：

1. 单个路由不支持同时设置多个匹配规则，一个后端服务可能存在多个 API 路径，如果 API 规则太多，维护就变得比较困难。APISIX 允许你设置多个匹配规则。
2. 路由不支持 APISIX 的上线、下线，使用灰度发布场景，需要手动删除。
3. 不支持静态资源代理，只能把静态资源打包为 Pod 暴露出去，而 APISIX 可以通过 Nginx 底层配置实现。
