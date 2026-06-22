---
title: CODING Cloud Native Application Delivery Practice
date: 2023-08-10
description: Overall CODING feels good and meets our business needs, but CODING's release functionality still needs optimization.
tags:
  - CODING
  - Cloud Native Applications
  - CI/CD
  - GitOps
  - OAM
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CODING.png
---

# Background

We introduced Tencent Cloud CODING as the build method for new projects, practicing the DevOps integrated development and operations philosophy.

During usage, we found that the continuous integration functionality couldn't meet some of our scenarios:

1. Visual orchestration only supports image updates, not image deployment - requiring manual `kubectl apply`, which isn't user-friendly enough for developers.
2. Deployment personnel are unfamiliar with Kubernetes cloud-native environment, such as Deployment, Service, ConfigMap resources.
3. In production release scenarios, batch releases aren't supported, lacking proper production release processes, deployment tracking, and rollback mechanisms.

These issues are exactly what OAM aims to solve.

OAM (Open Application Model) is a cloud-native application specification model jointly open-sourced by Alibaba and Microsoft, built on GitOps foundation. For OAM, infrastructure as code means all code can be version-controlled via Git. Anyone who has used Kubernetes knows that resource changes are basically done through `kubectl apply YAML file` API calls. OAM essentially puts YAML files under Git management, and based on development and operations team perspectives, splits YAML content for separate maintenance. During build phase, files are parsed and merged into Kubernetes-understandable content to achieve resource changes. Tencent Cloud implemented the Orbit tool based on OAM model for rapid cloud-native application delivery.

At our company, the development team expressed their needs - they wanted application-level orchestration where the minimum scheduling unit is App. That means one application contains multiple services, without caring about how K8s Deployment is deployed, how Service binds, how ConfigMap mounts... The operations team indicated they could maintain K8s templates but didn't want to participate in business logic.

Based on the situation, I divided the responsibilities between development and operations teams as follows:

- Developers (Regular): Write code, upload APIs, release Tags
- Developers (Deployment): Service creation and orchestration, version releases, deployment operations
- Operations: Design K8s templates and ops plugins

The collaboration workflow is shown below. Developers in the diagram typically have deployment permissions.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-workflow.png)

# Objective

Use CODING's self-developed Orbit tool to implement production environment deployment.

# Practice

## Operations Personnel Prepare Environment

Operations personnel (K8s experts) create service templates and ops plugins.

First, add K8s cluster.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-add-kubernetes-cluster.png)

Go to `Team Settings Center` > `Feature Settings` > `Service Templates`, create templates for workloads like `Deployment`, `StatefulSet`, `Job`, `DaemonSet`. Below, I created a Deployment template.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-edit-component-template-detail.png)

The corresponding `Workload` code snippet, containing the `Custom Variables` text content from the diagram:

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

The corresponding `Service Discovery` code snippet:

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

Go to `Team Settings Center` > `Feature Settings` > `Ops Plugins`, create ops plugins like `ConfigMap`, `Secret`, `Probe`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-edit-trait-template.png)

## Deployment Personnel Orchestrate Applications

Deployment personnel are responsible for creating applications, environments, services, and configurations.

Create your application in `Application Center`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-app.png)

Add environment.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-env.png)

Add service, select ops plugins as needed, and orchestrate.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-compose-component.png)

Add configuration for multiple services to share, specifically `ConfigMap` and `Secret`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-shared-config.png)

## Developers Continuous Integration

Regular developers don't participate in OAM releases, only responsible for code commits and releases.

After developers release a Tag via `maven-release-plugin`, it automatically triggers CODING's build plan, publishing to Docker artifacts. Deployment personnel can then select the corresponding version in service management.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-change-image-version.png)

## Deployment Personnel Release to Production

Deployment personnel can modify image version, pod replicas, configuration files in `Service Management`, then click to release to production. After service configuration changes, click `Create Version` and select images to update. If configurations changed, the form will show the changes for verification.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-create-app-version.png)

After version creation, click release and specify the deployment process (each deployment process corresponds to a runtime environment).

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-publish-app-version.png)

Wait for deployment. When all readiness probes complete, deployment is done.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-wait-app-deploy.png)

If issues occur during deployment, click cancel in the upper right corner - all current changes will roll back.

After deployment completes, we configured DingTalk notifications. Successful deployment notification looks like this:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-deploy-app-success-notice.png)

If cancel was clicked during deployment or deployment timed out, deployment failure is shown.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-deploy-app-failed-notice.png)

If successful, you can see in Orbit application management that the version was successfully released.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-app-overview.png)

View CODING's release operation records.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-app-publish-log.png)

# Summary

Overall CODING feels good and meets our business needs, but CODING's release functionality still needs optimization.

Configuration management doesn't support adding Secrets via UI - recommend creating new files in code repository with base64 encoded content.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-edit-oam-code-usebase64.png)

Configuration management doesn't support deleting ConfigMaps - this is a CODING bug, currently can only delete from code repository.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-delete-configmap-from-code-repo.png)

If rollback on failure is selected in deployment process and cancel is clicked during release, recommend waiting before publishing new version. Otherwise, the previous version might be rolling back and your new version could be rolled back too. If you see `Invalid value: "": may not be specified when value is not empty` when publishing, recommend deleting YAML from Tencent Cloud console and republishing.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-reserve-if-deploy-failed.png)

Since CODING doesn't currently support storage configuration, we implemented ConfigMap and NFS mounting via ops plugins. In application management, referencing the same ops plugin multiple times isn't supported and causes issues. Therefore, we distinguish some plugins using numbers.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-orbit-trait-mutil-nfs-bug.png)

Hope CODING continues to improve.
