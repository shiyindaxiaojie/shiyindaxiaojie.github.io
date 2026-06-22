---
title: KubeVela 云原生应用交付实践
date: 2025-01-03
description: KubeVela 作为实现 OAM 的开源项目，使用感受如下。
tags:
  - KubeVela
  - CI/CD
  - GitOps
  - OAM
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/KubeVela.png
---

# 背景

KubeVela 是一个开箱即用的现代化应用交付与管理平台，通过**开放应用模型**（OAM）来作为应用交付的顶层抽象，采用声明式的方式描述应用交付全流程，自动化的集成 CI/CD 及 GitOps 体系，通过 CUE 轻松扩展、复用或重新编写交付过程。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-overview.png)

在公司内部，笔者使用 CODING 平台搭建生产环境的 CI/CD 流程，基于 Orbit 落地了 OAM 发布方案。由于 CODING 商业化调整，Orbit 只有旗舰版才能使用。因此，笔者准备调研 KubeVela 是否能平替 CODING。 

# 目标

验证 KubeVela 是否能实现 Orbit 的 CI/CD 流程，并给出对 KubeVela 的评价。

# 部署

在现有的 Kubernetes 集群搭建 KubeVela，使用官方提供的 Helm 脚本部署，代码片段如下。

```bash
helm repo add kubevela https://kubevela.github.io/charts

helm upgrade --install --create-namespace -n vela-system kubevela kubevela/vela-core --wait
```

安装 KubeVela CLI，用于管理集群和应用。

```bash
# Linux
curl -fsSl https://kubevela.io/script/install.sh | bash
# Windows
powershell -Command "iwr -useb https://kubevela.net/script/install.ps1 | iex"
```

安装 KubeVela 核心组件。

```bash
> vela version
CLI Version: 1.8.2
Core Version:
GitRevision: git-360f69be
GolangVersion: go1.19.9

> vela install
Check Requirements ...
Installing KubeVela Core ...
Helm Chart used for KubeVela control plane installation: https://charts.kubevela.net/core/vela-core-1.8.2.tgz

Existing KubeVela installation found in namespace vela-system

Do you want to overwrite this installation? (y/n)
...
Start upgrading Helm Chart kubevela in namespace vela-system
getting history for release kubevela
Found existing installation, overwriting...preparing upgrade for kubevela
...
updating status for upgraded release for kubevela

KubeVela control plane has been successfully set up on your cluster.
If you want to enable dashboard, please run "vela addon enable velaux"
```

安装 VelaUX，便于通过浏览器访问 KubeVela 的 UI 控制台。

```bash
vela addon enable velaux
# admin/VelaUX12345
vela port-forward -n vela-system addon-velaux 8000:8000
```

访问控制台 `http://host:8000`，弹出初始化窗口，输入用户名和密码创建。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-init.png)

# 使用

KubeVela 定义了一组关系，从大到小依次为 `项目`、`交付目标`、`环境`、`应用`、`组件`。

首先，创建您的项目，下图创建了名为 `demo` 的项目。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-project.png)

创建 `交付目标`，用于指定 Kubernetes 的部署位置，笔者分别创建了 `demo` 命名空间和 `demo-gray` 命名空间。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-object.png)

创建 `环境`，笔者分别创建了 `生产环境` 指向 `demo` 交付目标，`灰度环境` 指向 `demo-gray` 交付目标，

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-env.png)

创建 `应用`，笔者创建了名为 `demo` 的应用，主组件类型为 `webservice` 服务，并绑定 `生产环境` 和 `灰度环境`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app.png)

点击下一步，为主组件设置容器镜像、内存、CPU、服务访问方式等。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-with-image.png)

您还可以展开高级选项，设置 ENV 环境变量、CMD 启动命令、Probe 探针等参数。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-advanced-args.png)

关于镜像的 Secret，您可以在 `管理面板` > `全局配置` > `Image Registry` 设置。下图，笔者使用了自建的 Harbor 作为私有仓库。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-set-harbor-registry.png)

一个应用可以设置多个组件，如下图，笔者分别创建了 `基础服务`、`认证中心`、`消息中心`、`订单中心`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-overview.png)

您可以编排某个服务依赖其他服务，例如，`订单中心`依赖`消息中心`、`认证中心`启动完成后才能进行部署。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-depend-on.png)

您也可以根据服务的规模调整 Pod 数量。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-modify-app-scaler.png)

在实际的生产场景，多个组件可能会共享同一个 ConfigMap。

在 KubeVela 有两种做法，第一种是定义一个独立的组件，组件类型为 `k8s-objects`，然后在自定义的 YAML 内容定义您的 ConfigMap。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-k8s-objects.png)

第一种方式笔者认为不合适，容易混淆我们的业务组件，并且很难适配不同的运行环境。笔者更倾向于使用第二种方式，基于策略使用配置覆盖的形式处理，如下图，笔者分别在 `灰度环境` 创建了 `override-gray` 策略，在生产环境创建了 `override-prod` 策略。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-create-app-override.png)

灰度环境 `override-gray.yaml` 代码片段如下。

```yaml
components:
  - properties: 
      env:
        - name: SPRING_PROFILES_ACTIVE # 新增一个 ENV 变量
          valueFrom:
            configMapKeyRef:
              key: SPRING_PROFILES_ACTIVE
              name: app-configmap
              optional: false
    type: webservice # 替换所有组件
  # name: demo # 如果加上 name，就匹配某些组件 
  - name: app-configmap # 创建名为 `app-configmap` 的配置字典
    properties:
      objects:
        - apiVersion: v1
          data: # 使用 key-value 配置您的内容
            SPRING_PROFILES_ACTIVE: gray
          kind: ConfigMap
          metadata:
            name: app-configmap
            namespace: demo-gray # 在灰度环境命名空间生效
    type: k8s-objects
```

生产环境 `override-prod.yaml` 代码片段如下。

```yaml
components:
  - properties:
      env:
        - name: SPRING_PROFILES_ACTIVE
          valueFrom:
            configMapKeyRef:
              key: SPRING_PROFILES_ACTIVE
              name: app-configmap
              optional: false
        - name: JAVA_OPTS
          valueFrom:
            configMapKeyRef:
              key: JAVA_OPTS
              name: app-configmap
              optional: false
    type: webservice
  - name: app-configmap
    properties:
      objects:
        - apiVersion: v1
          data:
            JAVA_OPTS: >-
              -Dspring.cloud.nacos.config.username=nacos
              -Dspring.cloud.nacos.config.password=
              -Dspring.cloud.nacos.config.server-addr=10.2.2.109:8848
              -Dspring.cloud.nacos.config.namespace=prod
              -Dspring.cloud.nacos.config.group=spring-cloud
              -Dspring.cloud.nacos.discovery.username=nacos
              -Dspring.cloud.nacos.discovery.password=
              -Dspring.cloud.nacos.discovery.server-addr=10.2.2.109:8848
              -Dspring.cloud.nacos.discovery.namespace=prod
              -Dspring.cloud.nacos.discovery.group=spring-cloud
            SPRING_PROFILES_ACTIVE: prod
          kind: ConfigMap
          metadata:
            name: app-configmap
            namespace: demo
    type: k8s-objects    
```

点击部署，多个组件根据描述定义自动更新。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app.png)

在 Kubernetes 查看部署状态。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-in-kubesphere.png)

因为笔者没有对部署的组件设置 Probe 探针，KubeVela 很快就显示部署成功。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-success.png)

查看部署的拓扑状态，您可以看到 KubeVela 创建了 4 个 Deployment 无状态服务和 1 个 ConfigMap 配置字典，符合期望。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-topology.png)

点击日志，可以直接查看 Pod 的控制台日志信息。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-logview.png)

这个时候，发现有报错哈，准备回滚，您可以从 `版本` 找到记录，点击 `回滚`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-deploy-app-version.png)

KubeVela 支持回收资源，也就是前面部署的一系列资源，可以一键清理，确保对现有环境不污染。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kube-vela/kube-vela-undeploy-app.png)

# 总结

KubeVela 作为实现 OAM 的开源项目，使用感受如下。
1. 支持应用编排多个组件，一键部署，一键回收，实时观测服务状态。
2. 允许您修改运维组件，为团队定制服务。不过运维组件扩展不能新增？只能修改现有的组件，而且能修改的位置有限制。
3. 需要熟悉 CUE 语法，在配置 ConfigMap 这一块，没有可视化组件，只能自己写代码处理。

和商业化 CODING 相比如下。
1. 不支持 CODING 勾选某些组件是否更新，不过这个问题不大，只要没有版本变化，不会触发更新。
2. 在命名组件时，默认按应用名作为前缀，例如，笔者使用 `demo` 应用名，其他的组件强制以 `demo` 开头，无法自定义。
3. 在其他方面，CODING 显得功能不完整，存在 Bug，例如，公测到现在，PVC 组件仍然没有实现。

整体来说，KubeVela 作为 CODING 的平替是没有问题的，值得使用。