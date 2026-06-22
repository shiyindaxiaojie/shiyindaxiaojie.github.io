---
title: KubeVela Cloud Native Application Delivery Practice
date: 2025-01-03
description: As open-source OAM implementation, KubeVela experience
tags:
  - KubeVela
  - CI/CD
  - GitOps
  - OAM
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/KubeVela.png
---

# Background

KubeVela is an out-of-the-box modern application delivery and management platform. Using **Open Application Model** (OAM) as top-level abstraction for application delivery, it declaratively describes the entire delivery process, automatically integrates CI/CD and GitOps systems, and easily extends, reuses, or rewrites delivery processes through CUE.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-overview.png)

Internally, I used CODING platform to build production CI/CD processes based on Orbit implementing OAM release solution. Due to CODING commercialization adjustments, Orbit is only available in flagship edition. Therefore, I'm researching whether KubeVela can replace CODING.

# Objective

Verify whether KubeVela can implement Orbit's CI/CD process and provide evaluation of KubeVela.

# Deployment

Set up KubeVela on existing Kubernetes cluster using official Helm script:

```bash
helm repo add kubevela https://kubevela.github.io/charts
helm upgrade --install --create-namespace -n vela-system kubevela kubevela/vela-core --wait
```

Install KubeVela CLI for managing clusters and applications:

```bash
# Linux
curl -fsSl https://kubevela.io/script/install.sh | bash
# Windows
powershell -Command "iwr -useb https://kubevela.net/script/install.ps1 | iex"
```

Install KubeVela core components:

```bash
> vela version
CLI Version: 1.8.2
Core Version:
GitRevision: git-360f69be
GolangVersion: go1.19.9

> vela install
...
KubeVela control plane has been successfully set up on your cluster.
If you want to enable dashboard, please run "vela addon enable velaux"
```

Install VelaUX for browser access to KubeVela UI console:

```bash
vela addon enable velaux
# admin/VelaUX12345
vela port-forward -n vela-system addon-velaux 8000:8000
```

Access console at `http://host:8000`, enter username and password in initialization window.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-init.png)

# Usage

KubeVela defines relationships from large to small: `Project`, `Delivery Target`, `Environment`, `Application`, `Component`.

First, create your project. Below shows creating project named `demo`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-project.png)

Create `Delivery Target` to specify Kubernetes deployment location. I created `demo` namespace and `demo-gray` namespace.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-object.png)

Create `Environment`. I created `Production` pointing to `demo` target and `Gray` pointing to `demo-gray` target.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-env.png)

Create `Application`. I created application named `demo` with main component type `webservice`, bound to `Production` and `Gray` environments.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app.png)

Click Next to set container image, memory, CPU, service access method, etc.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-with-image.png)

You can also expand advanced options to set ENV variables, CMD startup commands, Probe parameters, etc.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-advanced-args.png)

For image Secrets, you can set in `Admin Panel` > `Global Config` > `Image Registry`. Below, I used self-hosted Harbor as private registry.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-set-harbor-registry.png)

One application can have multiple components. Below, I created `Base Service`, `Auth Center`, `Message Center`, `Order Center`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-overview.png)

You can orchestrate service dependencies. For example, `Order Center` depends on `Message Center` and `Auth Center` completing startup before deployment.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-depend-on.png)

You can also adjust Pod count based on service scale.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-modify-app-scaler.png)

In production scenarios, multiple components may share the same ConfigMap. KubeVela offers two approaches.

The second approach using policy-based configuration override is preferred. I created `override-gray` policy for gray environment and `override-prod` for production.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-override.png)

Click deploy. Multiple components auto-update based on definition.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app.png)

Check deployment status in Kubernetes.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-in-kubesphere.png)

Since I didn't set Probes for components, KubeVela quickly shows deployment success.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-success.png)

View deployment topology. KubeVela created 4 Deployment stateless services and 1 ConfigMap as expected.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-topology.png)

Click logs to view Pod console logs directly.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-logview.png)

If errors are found, prepare to rollback from `Versions` tab.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-version.png)

KubeVela supports resource recycling - one-click cleanup of previously deployed resources without polluting existing environment.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-undeploy-app.png)

# Summary

As open-source OAM implementation, KubeVela experience:

1. Supports multi-component application orchestration, one-click deploy/recycle, real-time service status observation.
2. Allows modifying ops components to customize for teams. However, can't add new ops component extensions - only modify existing ones with limitations.
3. Requires familiarity with CUE syntax. ConfigMap configuration lacks visual components - must write code manually.

Compared to commercial CODING:

1. Doesn't support CODING's selective component update checkbox - but not major since unchanged versions don't trigger updates.
2. Component naming defaults to app name prefix. For example, with `demo` app name, other components must start with `demo` - can't customize.
3. In other aspects, CODING appears incomplete with bugs. For example, PVC component still unimplemented since beta.

Overall, KubeVela is viable CODING replacement and worth using.
