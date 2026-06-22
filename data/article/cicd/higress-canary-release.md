---
title: Higress Canary Release Practice
date: 2024-03-16
description: After introducing Higress cloud-native gateway, we removed Spring Cloud Gateway and can easily implement A/B testing and canary release scenarios.
tags:
  - Higress
  - A/B Testing
  - Canary Release
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Higress.png
---

# Background

Higress is an open-source cloud-native gateway from Alibaba, built on Istio + Envoy core. It achieves high integration capabilities combining traffic gateway + microservice gateway + security gateway, deeply integrating with Dubbo, Nacos, Sentinel and other microservice technology stacks.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-all-in-one.png)

For detailed information about Higress, please refer to the [Higress Documentation](https://higress.cn/docs/latest/overview/what-is-higress).

In early deployment architecture, businesses typically used `WAF Security Gateway` + `Nginx Traffic Gateway` + `Spring Cloud Gateway Microservice Gateway`.

One user request -> LB (WAF) -> Nginx -> Spring Cloud Gateway -> Microservice

This causes complexity in trace analysis and daily maintenance. Therefore, we tried introducing Higress gateway, removing Spring Cloud Gateway dependency, shortening the request chain as follows:

One user request -> LB (WAF) -> Higress -> Microservice

# Objective

Verify whether Higress gateway can replace Spring Cloud Gateway and implement A/B testing, canary release functionality.

# Deployment

For easier maintenance, deploy Higress gateway using Helm:

```bash
helm install higress --create-namespace --namespace higress higress.io/higress
```

View deployed workloads in KubeSphere. You can see Higress creates `higress-gateway` access endpoint, `higress-console` console, and `higress-controller` controller.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-deployment.png)

Adjust `higress-gateway` console service port to 80 for unified external access.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-service.png)

Adjust `higress-console` console service port to 8080, with initial credentials `admin/admin`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-console.png)

# Usage

> This article only explains basic configuration process, not domain and certificate configuration steps.

## Configure Service Sources

Higress supports service registry integration with `Nacos`, `Eureka`, `Consul`, `Zookeeper`.

For example, the diagram below shows Nacos 2.x configuration.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-register-nacos2.png)

View service list, select namespace as `mcp`, filter services from the registry.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-register-list.png)

## Configure Route List

Assume request endpoint is `/api/auth`, configure as Route A as shown below.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-canary-none.png)

If actual request endpoint is `/demo/api/auth` and expected backend request is `/api/auth`, set rewrite policy.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-rewrite-router.png)

Higress allows you to add multiple routes to replace `Spring Cloud Gateway` API routing strategies.

## Verify A/B Testing

Higress implements blue-green deployment, A/B testing, and canary release via `higress.io/canary` annotation.

First, keep Route A configured above. When request doesn't carry any Headers or Cookies, it defaults to this route.

Add new Route B, controlled by `higress.io/canary-by-header`. As shown below, we configured `higress.io/canary-by-header=region` and `higress.io/canary-by-header-value=gz|bj`. When client carries `region` parameter value `gz` or `bj` in HTTP request header, requests route to Route B, otherwise to original Route A.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-canary-header.png)

Use curl command to simulate requests and view routing results.

```bash
curl --request GET http://10.2.2.109/api/auth

Route A
Route A
Route A
Route A

curl --request GET http://10.2.2.109/api/auth --header 'region: gz'

Route B
Route B
Route B
Route B
```

## Verify Canary Release

For canary release scenarios, use `higress.io/canary-weight` weight control. You can add Route C as shown below, gradually increasing weight from 20 to 80, splitting traffic from original Route A.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/higress/higress-canary-weight.png)

Use curl command to simulate requests and view routing results.

```bash
> curl --request GET http://10.2.2.109/api/auth

Route A
Route A
Route A
Route C
Route A
Route C
Route C
Route C
```

# Summary

After introducing Higress cloud-native gateway, we removed `Spring Cloud Gateway` and can easily implement A/B testing and canary release scenarios. However, compared to APISIX, current version has some limitations:

1. Single route doesn't support multiple matching rules simultaneously. One backend service may have multiple API paths - if too many API rules, maintenance becomes difficult. APISIX allows setting multiple matching rules.
2. Routes don't support APISIX's online/offline feature. For canary release scenarios, manual deletion is required.
3. Static resource proxying not supported - static resources can only be packaged as Pod and exposed, while APISIX can achieve this through underlying Nginx configuration.
