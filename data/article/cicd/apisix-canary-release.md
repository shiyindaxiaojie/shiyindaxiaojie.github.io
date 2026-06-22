---
title: APISIX Canary Release Practice
date: 2023-08-16
description: After introducing APISIX cloud-native gateway, we replaced Nginx, resolved the network jitter issue during Nginx reload, and can easily implement A/B ...
tags:
  - APISIX
  - Cloud Native Gateway
  - A/B Testing
  - Canary Release
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/APISIX.png
---

# Background

Apache APISIX is a cloud-native API gateway under the Apache Software Foundation, developed and donated by API7.ai. Built on NGINX + ngx_lua, it provides dynamic routing, dynamic upstream, dynamic certificates, A/B testing, canary release (grayscale release), blue-green deployment, rate limiting, attack prevention, metrics collection, monitoring alerts, observability, and service governance.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-architect.png)

For detailed information, please refer to the [APISIX Documentation](https://apisix.apache.org/docs/apisix/getting-started/README/).

Due to network jitter during Nginx reload and increasingly difficult nginx configuration maintenance as business routes grow, APISIX addresses these issues according to official documentation. Therefore, we attempted to introduce APISIX as a cloud-native gateway to implement A/B testing and canary release functionality.

# Objective

Introduce APISIX to replace Nginx gateway and simplify production operations.

# Deployment

For easier maintenance, deploy APISIX gateway using the official Helm script as follows:

```bash
helm repo add apisix https://charts.apiseven.com
helm repo update
helm install apisix apisix/apisix --create-namespace  --namespace apisix
```

View the deployed workloads in KubeSphere. You can see APISIX creates `apisix` access endpoint, `apisix-dashboard` console, and `apisix-ingress-controller` controller.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-deployment.png)

Adjust the `apisix` gateway service port to 80, `apisix-dashboard` console service port to 9000, with initial credentials `admin/admin`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-dashboard.png)

# Configuration

> This article only explains the basic configuration process, not domain and certificate configuration steps.

## Configure Upstream

Assume creating an upstream named `eden-demo-cola`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-upstream.png)

## Configure Service

Add `eden-demo-cola` service and bind the created upstream.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-service.png)

## Configure Route

Assume the request endpoint is `/api/auth`, configure it as Route A as shown below.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-router.png)

If your upstream service endpoint is `/auth`, you can rewrite the request path from `/api/auth` to `/auth`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-rewrite-router.png)

## Verify A/B Testing

Save Route A created above. When client doesn't carry any request headers, it defaults to Route A.

Add new Route B and set HTTP headers to control request acceptance, such as `region=gz` or `region=sz`. When client carries these headers, it will access Route B.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-create-router-by-header.png)

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

APISIX console provides weight control option when configuring upstream. You can add multiple nodes to implement canary release.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/apisix/apisix-update-upstream-weight.png)

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

After introducing APISIX cloud-native gateway, we replaced Nginx, resolved the network jitter issue during Nginx reload, and can easily implement A/B testing and canary release scenarios.

This article does not discuss APISIX Ingress Controller usage, as APISIX Dashboard functionality is sufficient for our needs.
