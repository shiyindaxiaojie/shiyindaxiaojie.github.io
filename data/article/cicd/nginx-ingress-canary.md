---
title: NGINX Ingress Canary Release Practice
date: 2022-08-16
description: Implementing A/B testing and canary release with NGINX Ingress Controller is relatively simple, but NGINX reload issues aren't completely solved.
tags:
  - NGINX
  - Load Balancing
  - A/B Testing
  - Canary Release
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/APISIX.png
---

# Background

Early in our system development, we used Tencent Cloud CLB load balancer for blue-green releases. Since CLB design only binds to Tencent Cloud CVM servers, it's unfriendly to Serverless cluster architecture. To solve this, I tried deploying NGINX Ingress Controller on Tencent Cloud for canary releases.

# Objective

Explore implementing canary releases with NGINX Ingress Controller.

# Deployment

## Prepare Nginx Test Cases

Deploy nginx-v1 and nginx-v2 workloads as test cases using `openresty/openresty:centos` as base image.

nginx-v1 deployment snippet:

```yaml
# StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  labels:
    k8s-app: nginx
    version: v1
  name: nginx-v1
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      version: v1
  template:
    spec:
      containers:
        - image: openresty/openresty:centos
          name: nginx
          volumeMounts:
            - mountPath: /usr/local/openresty/nginx/conf/nginx.conf
              name: conf
              subPath: nginx.conf
      volumes:
        - configMap:
            name: nginx-v1
          name: conf
```

## Create NGINX Ingress Controller

```yaml
apiVersion: cloud.tencent.com/v1alpha1
kind: NginxIngress
metadata:
  name: nginx-ingress
spec:
  ingressClass: nginx-ingress
  service:
    type: LoadBalancer
  watchNamespace: default
```

You can see NGINX Ingress instance successfully deployed in Tencent Cloud console.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/eks-nginx-ingress-controller-created.png)

## Create NGINX Ingress

Create nginx-ingress pointing to nginx-v1 service. Client requests default to this Ingress.

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx-ingress
  name: nginx-ingress
  namespace: default
spec:
  rules:
    - http:
        paths:
          - backend:
              serviceName: nginx-v1
              servicePort: 80
```

Create nginx-ingress-canary pointing to nginx-v2 service via `nginx.ingress.kubernetes.io/canary: "true"` annotation for canary.

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx-ingress
    nginx.ingress.kubernetes.io/canary: "true"
  name: nginx-ingress-canary
  namespace: default
spec:
  rules:
    - http:
        paths:
          - backend:
              serviceName: nginx-v2
              servicePort: 80
```

## Verify A/B Testing

Use curl to verify traffic splitting effectiveness.

Before enabling traffic splitting:

```bash
[root@localhost ~]# for i in {1..10}; do curl http://172.28.84.54; done;
nginx-v1
nginx-v1
nginx-v1
...
```

Add to `nginx-ingress-canary`:

```yaml
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-by-header: region
  nginx.ingress.kubernetes.io/canary-by-header-pattern: gz|sz
```

Add `region=gz` to curl request header:

```bash
[root@localhost ~]# curl http://172.28.84.54;
nginx-v1
[root@localhost ~]# curl -H "region: gz" http://172.28.84.54;
nginx-v2
[root@localhost ~]# curl -H "region: sz" http://172.28.84.54;
nginx-v2
```

Verification passed. Using `nginx.ingress.kubernetes.io/canary-by-header-pattern: gz|sz` means new version canary goes to gz or sz regions.

## Verify Canary Release

Canary release mainly uses weight for gradual traffic splitting via `nginx.ingress.kubernetes.io/canary-weight`.

```yaml
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-weight: "10"
```

Curl request response:

```bash
[root@localhost ~]# for i in {1..10}; do curl http://172.28.84.54; done;
nginx-v1
nginx-v2
nginx-v1
nginx-v1
...
```

Verification passed. Results show approximately 10% traffic diverted to canary version.

# Summary

Implementing A/B testing and canary release with NGINX Ingress Controller is relatively simple, but NGINX reload issues aren't completely solved. I prefer using APISIX Ingress Controller for canary releases.
