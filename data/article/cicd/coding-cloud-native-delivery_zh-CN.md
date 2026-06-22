---
title: CODING 云原生应用交付实践
date: 2023-08-10
description: CODING 整体使用感觉不错，可以满足我们的业务需求，但是 CODING 的发布功能还不太完善，需要后续优化。
tags:
  - CODING
  - 云原生应用
  - CI/CD
  - GitOps
  - OAM
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CODING.png
---

# 背景

我们引入了腾讯云 CODING 作为新项目的构建方式，践行了 DevOps 研发运营一体化的理念。

在使用的过程中，我们也发现持续集成这块功能，不能满足我们一些场景。

1. 可视化编排只支持镜像更新，不支持镜像部署，需要手动写 `kubectl apply` 实现，对于研发人员来说，不够傻瓜化。
2. 部署人员对 Kubernetes 云原生环境不熟悉，例如 Deployment、Service、ConfigMap 等资源。
3. 在生产发布场景，不支持批量发布，没有完善的生产发布流程，缺乏上线留痕和回滚机制。

上述的问题其实就是 OAM 要解决的目标。

OAM（Open Application Model）是阿里巴巴和微软共同开源的云原生应用规范模型，构建于 GitOps 基础上。对于 OAM 来说，基础设施即代码，一些代码都可以基于 Git 版本控制。稍微用过 Kubernetes 的伙伴可以知道，Kubernetes 的资源变更基本都是 `kubectl apply YAML 文件` 调用 API 实现。OAM 的本质就是把 YAML 文件放到 Git 管理，并根据研发团队和运维团队的视角，将 YAML 内容拆分维护，在构建阶段，将各文件解析，合并为 Kubernetes 能理解的内容，实现资源变更。腾讯云基于 OAM 模型实现了 Orbit 工具，可以快速实现云原生应用交付。

在笔者的公司，研发团队提出了他们的诉求，他们希望的是应用级别的编排，最小调度单位是 App，也就是说，一个应用下有多个服务，不关心 K8s 的 Deployment 如何部署，Service 如何绑定，ConfigMap 如何挂载...而运维团队表示，他们可以负责维护 K8s 模板，但不想参与业务。

笔者根据现状，将研发团队和运维团队的职责细分如下。

- 开发人员（普通）：编写代码、上传 API、发布 Tag
- 开发人员（部署）：服务创建和编排，版本发布，上线操作
- 运维人员：设计 K8s 模板和运维插件

协作流程如下，图中的开发人员一般是有部署权限的研发。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-workflow.png)

# 目标

使用 CODING 自研的 Orbit 工具实现生产环境的部署。

# 实战

## 运维人员准备环境

运维人员（K8s 专家）创建服务模板和运维插件。

首先，添加 K8s 集群。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-add-kubernetes-cluster.png)

进入 `团队设置中心` > `功能设置` > `服务模板`，创建 `Deployment`、`StatefuleSet`、`Job`、`DaemonSet` 等工作负载的模板。下图，笔者创建了一个 Deployment 模板。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-edit-component-template-detail.png)

对应的 `工作负载` 代码片段如下，包含了图中 `自定义变量` 的文本内容。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{.name}}
  annotations:
    reloader.stakater.com/auto: "true"
  labels:
    k8s-app: {{.name}}
    qcloud-app: {{.name}}
spec:
  {{- if .replicas }}
  replicas: {{ .replicas }}
  {{- end }}
  selector:
    matchLabels:
      k8s-app: {{.name}}
      qcloud-app: {{.name}}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      annotations:
        eks.tke.cloud.tencent.com/cpu-type: intel
        eks.tke.cloud.tencent.com/root-cbs-size: "20"
        {{- if .isolated }}
        eks.tke.cloud.tencent.com/security-group-id: {{ .isolated.securityGroupId }}
        {{- else }}
        eks.tke.cloud.tencent.com/security-group-id: "sg-233333"
        {{- end }}
      labels:
        k8s-app: {{.name}}
        qcloud-app: {{.name}}
    spec:
      containers:
      - env:
        - name: TZ
          value: Asia/Shanghai
        - name: LANG
          value: C.UTF-8
        - name: SPRING_PROFILES_ACTIVE
          valueFrom:
            configMapKeyRef:
              key: SPRING_PROFILES_ACTIVE
              name: java
              optional: false
        - name: JAVA_OPTS
          valueFrom:
            configMapKeyRef:
              key: JAVA_OPTS
              name: java
              optional: false
        {{- if .jvm}}
        - name: XMS
          value: {{ default 1536 .jvm.xms}}m
        - name: XMX
          value: {{ default 1536 .jvm.xmx}}m
        - name: XSS
          value: {{ default 256 .jvm.xss}}k
        - name: GC_MODE
          value: {{ default "G1" .jvm.gcmode | quote}}
        - name: USE_GC_LOG
          value: {{ default "Y" .jvm.gcmode | quote}}
        - name: USE_HEAP_DUMP
          value: {{ default "Y" .jvm.gcmode | quote}}
        - name: USE_LARGE_PAGES
          value: {{ default "N" .jvm.gcmode | quote}}
        {{- end}}
        {{- if .containeredJvm}}
        - name: JVM_INIT_RAM_PERC
          value: {{ default "70.0" .containeredJvm.initialRAMPercentage | quote}}
        - name: JVM_MIN_RAM_PERC
          value: {{ default "70.0" .containeredJvm.minRAMPercentage | quote}}
        - name: JVM_MAX_RAM_PERC
          value: {{ default "70.0" .containeredJvm.maxRAMPercentage | quote}}
        {{- end}}
        name: {{.name}}
        image: {{ .image}}
        imagePullPolicy: {{ .imagePullPolicy | default "IfNotPresent"}}
        ports:
        - containerPort: {{.port}}
          protocol: TCP
```

对应的 `服务发现` 代码片段如下。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: { { .name } }
spec:
  selector:
    k8s-app: { { .name } }
    qcloud-app: { { .name } }
  ports:
    - name: http
      port: { { .port } }
      protocol: TCP
      targetPort: { { .port } }
  type: ClusterIP
```

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-edit-component-template.png)

进入 `团队设置中心` > `功能设置` > `运维插件`，创建 `ConfigMap`、`Secret`、`Probe` 等运维插件。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-edit-trait-template.png)

## 部署人员编排应用

部署人员负责创建应用、环境、服务和配置。

在 `应用中心` 创建您的应用。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-app.png)

添加环境。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-env.png)

添加服务，根据需要选择运维插件，并进行编排。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-compose-component.png)

添加配置，便于多个服务共享，这里特指 `ConfigMap` 和 `Secret`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-shared-config.png)

## 研发人员持续集成

一般的开发人员不参与 OAM 发布，只负责代码的提交和发布。

开发人员通过 `maven-release-plugin` 插件发布 Tag 后，自动触发 CODING 的构建计划，发布到 Docker 制品，此时部署人员可以在服务管理选择对应的版本。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-change-image-version.png)

## 部署人员发布生产

部署人员可以在 `服务管理` 修改镜像的版本、Pod 副本数、配置文件等，然后点击发布到生产环境。服务配置变更后，点击 `创建版本`，选择需要更新的镜像。如果配置有变更，也会在表单出现变更内容，方便您核对。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-app-version.png)

版本创建完成后，点击发布，指定需要发布的流程（每个部署流程对于一套运行环境）

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-publish-app-version.png)

等待部署，当所有就绪探针检测完成后，部署完成。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-wait-app-deploy.png)

如果部署过程中遇到问题，您可以在右上角点击取消操作，当前的一切变更全部回滚。

部署执行完毕后，我们配置了钉钉通知，部署成功的提示如下。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-deploy-app-success-notice.png)

如果部署过程中点击了取消操作，或者部署超时，则提示部署失败。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-deploy-app-failed-notice.png)

顺利的话，在 Orbit 应用管理可以看到，版本已成功发布。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-app-overview.png)

查看 CODING 的发布操作记录。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-app-publish-log.png)

# 总结

CODING 整体使用感觉不错，可以满足我们的业务需求，但是 CODING 的发布功能还不太完善，需要后续优化。

配置管理不支持在界面添加 Secret，建议在代码仓库新建文件，里面的内容通过 base64 编码保存。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-edit-oam-code-usebase64.png)

配置管理不支持删除 ConfigMap，这个是 CODING 的 Bug，目前只能在代码仓库删除。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-delete-configmap-from-code-repo.png)

如果在部署流程选择了失败回滚，发布过程中点击了取消操作，建议等待一段时间，再次发布新版本。否则，有可能上一次版本在回滚，你发布的新版本会被回滚掉。如果在发布应用提示 `Invalid value: "": may not be specified when value is not empty`，这个建议从腾讯云控制台删除 YAML，再次发布。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-reserve-if-deploy-failed.png)

由于 CODING 目前没有支持存储配置，我们这边通过运维插件实现 ConfigMap 和 NFS 挂载，在应用管理，目前不支持重复引用相同的运维插件，否则会有问题。因此，我们有些插件通过数字区分。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-trait-mutil-nfs-bug.png)

希望 CODING 越做越好吧。
