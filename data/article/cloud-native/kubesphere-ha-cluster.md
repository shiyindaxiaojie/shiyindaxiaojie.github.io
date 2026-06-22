---
title: KubeSphere High Availability Cluster Setup
date: 2024-10-15
description: I recently started deploying a self-hosted datacenter and planned to set up a KubeSphere cluster.
tags:
  - Kubernetes
  - High Availability Cluster
  - Self-hosted Datacenter
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/KubeSphere.png
---

# Background

I recently started deploying a self-hosted datacenter and planned to set up a KubeSphere cluster. The official KubeSphere documentation seems to have some minor issues, so I am writing this article to record the actual operation process. You can follow it with confidence.

# Environment Preparation

Assuming there are 4 machine nodes, the planning is as follows:

- 10.2.2.109: Control node and etcd
- 10.2.2.140: Data node 1
- 10.2.2.211: Data node 2
- 10.2.1.9: NFS server, IP segment isolated from the KubeSphere cluster

## DNS Initialization

```bash
> cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6

10.2.2.109      k3s-master      k3s-master.novalocal
10.2.2.140      k3s-worker-01   k3s-worker-01.novalocal
10.2.2.211      k3s-worker-02   k3s-worker-02.novalocal
```

## NFS Initialization

Data will be lost after container restart, so it is recommended that you deploy an NFS storage in advance as the default storage class for Kubernetes.

Execute on all server nodes:

```bash
> yum install -y nfs-common
> yum upgrade -y
> vgcreate containervg /dev/vdb
> lvcreate -n container -l 100%FREE containervg
> mkfs.xfs /dev/mapper/containervg-container
> vi /etc/fstab
/dev/mapper/containervg-container /var/lib/containerd xfs     defaults        0 0
> mount -a
> yum install -y socat conntrack ebtables ipset ipvsadm
```

Execute on server node 10.2.1.9:

```bash
> parted /dev/sda
Using /dev/sda
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted) print
Model: DELL PERC H330 Mini (scsi)
Disk /dev/sda: 6000GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: pmbr_boot

Number  Start   End     Size    File system  Name            Flags
 1      1049kB  3146kB  2097kB                               bios_grub
 2      3146kB  2151MB  2147MB  xfs
 3      2151MB  110GB   107GB                                lvm
 4      110GB   2000GB  1890GB               cinder-volumes  lvm
 5      2000GB  2500GB  500GB                image-volume    lvm
 6      2500GB  3000GB  500GB                backup-volume   lvm
 7      3000GB  3500GB  500GB                nova-volume     lvm

(parted) mkpart k3s-nfs xfs 3500GB 5500GB
(parted) set 8 lvm on
(parted) print
Model: DELL PERC H330 Mini (scsi)
Disk /dev/sda: 6000GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: pmbr_boot

Number  Start   End     Size    File system  Name            Flags
 1      1049kB  3146kB  2097kB                               bios_grub
 2      3146kB  2151MB  2147MB  xfs
 3      2151MB  110GB   107GB                                lvm
 4      110GB   2000GB  1890GB               cinder-volumes  lvm
 5      2000GB  2500GB  500GB                image-volume    lvm
 6      2500GB  3000GB  500GB                backup-volume   lvm
 7      3000GB  3500GB  500GB                nova-volume     lvm
 8      3500GB  5500GB  2000GB  xfs          k3s-nfs         lvm

(parted) quit
Information: You may need to update /etc/fstab.

> udevadm settle
> cat /proc/partitions
> vgcreate k3snfsvg /dev/sda8
> lvcreate -n k3snfs -l 100%FREE k3snfsvg
> mkfs.xfs /dev/mapper/k3snfsvg-k3snfs
> mkdir -p /nfs/kubesphere
> vim /etc/fstab
/dev/mapper/k3snfsvg-k3snfs /nfs/kubesphere xfs     defaults        0 0

> systemctl daemon-reload
> mount -a
> df -h
> vim /etc/exports
/nfs/kubesphere   10.0.0.0/8(rw,sync,no_root_squash)

> exportfs -rv
> showmount -e localhost
> cd /nfs/kubesphere
> mkdir {rootfs,data,log,config}
```

## Docker Initialization

If Kubernetes uses Containerd as the container runtime, you can skip this step.

Execute on all server nodes:

```bash
> yum install -y yum-utils
> yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
> yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
> systemctl enable docker.service
# If VPN is not supported, it is recommended to set the registry mirror to m.daocloud.io
> vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://m.daocloud.io"]
}
> systemctl daemon-reload
> systemctl start docker.service
> systemctl status -l docker.service
```

# Deployment Process

## Master Node

Execute on server node 10.2.2.109:

```bash
> export KKZONE=cn
> mkdir k3s
> cd k3s
> curl -sfL https://get-kk.kubesphere.io | sh -
> sudo chmod +x kk
> ./kk version --show-supported-k8s
> ./kk create config --with-kubernetes v1.24.17 --with-kubesphere v3.4.1
> cp -p config-sample.yaml config-init.yaml
> vim config-init.yaml
```

Run `vim nfs-client.yaml` to create the NFS configuration file with the following content:

```bash
apiVersion: kubekey.kubesphere.io/v1alpha2
kind: Cluster
metadata:
  name: puyi
spec:
  hosts:
  - {name: k3s-master, address: 10.2.2.109, internalAddress: 10.2.2.109, user: root, password: "k3s-master@123"}
  roleGroups:
    etcd:
    - k3s-master
    control-plane:
    - k3s-master
    worker:
    - k3s-master
  controlPlaneEndpoint:
    domain: lb.kubesphere.local
    address: ""
    port: 6443
  kubernetes:
    version: v1.24.17
    clusterName: cluster.local
    autoRenewCerts: true
    containerManager: containerd
    maxPods: 220
  etcd:
    type: kubekey
  network:
    plugin: calico
    kubePodsCIDR: 10.233.64.0/18
    kubeServiceCIDR: 10.233.0.0/18
    multusCNI:
      enabled: false
  registry:
    privateRegistry: ""
    namespaceOverride: ""
    registryMirrors: []
    insecureRegistries: []
# This dependency seems to have failed, commenting it out for now
#  addons:
#  - name: nfs-rootfs
#    namespace: kube-system
#    sources:
#      chart:
#        name: nfs-rootfs-provisioner
#        repo: https://charts.kubesphere.io/main
#        valuesFile: /root/k3s/nfs-client.yaml
---
apiVersion: installer.kubesphere.io/v1alpha1
kind: ClusterConfiguration
metadata:
  name: ks-installer
  namespace: kubesphere-system
  labels:
    version: v3.4.1
spec:
  persistence:
    storageClass: ""
  authentication:
    jwtSecret: ""
  local_registry: ""
  etcd:
    monitoring: false
    endpointIps: localhost
    port: 2379
    tlsEnable: true
  common:
    core:
      console:
        enableMultiLogin: true
        port: 30880
        type: NodePort
    redis:
      enabled: false
      enableHA: false
      volumeSize: 2Gi
    openldap:
      enabled: false
      volumeSize: 2Gi
    minio:
      volumeSize: 20Gi
    monitoring:
      endpoint: http://prometheus-operated.kubesphere-monitoring-system.svc:9090
      GPUMonitoring:
        enabled: false
    gpu:
      kinds:
      - resourceName: "nvidia.com/gpu"
        resourceType: "GPU"
        default: true
    es:
      enabled: false
      logMaxAge: 7
      auditingMaxAge: 2
      eventMaxAge: 1
      istioMaxAge: 4
      elkPrefix: logstash
      basicAuth:
        enabled: false
        username: ""
        password: ""
      externalElasticsearchHost: ""
      externalElasticsearchPort: ""
    opensearch:
      enabled: true
      logMaxAge: 7
      auditingMaxAge: 2
      eventMaxAge: 1
      istioMaxAge: 4
      opensearchPrefix: whizard
      basicAuth:
        enabled: true
        username: "admin"
        password: "admin"
      externalOpensearchHost: ""
      externalOpensearchPort: ""
      dashboard:
        enabled: false
  alerting:
    enabled: true
  auditing:
    enabled: false
  devops:
    enabled: true
    jenkinsCpuReq: 1
    jenkinsCpuLim: 1
    jenkinsMemoryReq: 4Gi
    jenkinsMemoryLim: 4Gi
    jenkinsVolumeSize: 30Gi
  events:
    enabled: true
    ruler:
      enabled: true
      replicas: 2
  logging:
    enabled: true
    logsidecar:
      enabled: true
      replicas: 2
  metrics_server:
    enabled: true
  monitoring:
    storageClass: ""
    node_exporter:
      port: 9100
    gpu:
      nvidia_dcgm_exporter:
        enabled: false
  multicluster:
    clusterRole: none
  network:
    networkpolicy:
      enabled: true
    ippool:
      type: calico
    topology:
      type: weave-scope
  openpitrix:
    store:
      enabled: true
  servicemesh:
    enabled: false
    istio:
      components:
        ingressGateways:
        - name: istio-ingressgateway
          enabled: false
        cni:
          enabled: false
  edgeruntime:
    enabled: false
    kubeedge:
      enabled: false
      cloudCore:
        cloudHub:
          advertiseAddress:
            - ""
        service:
          cloudhubNodePort: "30000"
          cloudhubQuicNodePort: "30001"
          cloudhubHttpsNodePort: "30002"
          cloudstreamNodePort: "30003"
          tunnelNodePort: "30004"
      iptables-manager:
        enabled: true
        mode: "external"
  gatekeeper:
    enabled: false
  terminal:
    timeout: 600
  zone: ""
```

After modifying, press ESC and enter `:wq` to save and exit, then start the installation using KubeKey.

```bash
> egrep -v '#|^$' config-init.yaml
> ./kk create cluster -f config-init.yaml


 _   __      _          _   __
| | / /     | |        | | / /
| |/ / _   _| |__   ___| |/ /  ___ _   _
|    \| | | | '_ \ / _ \    \ / _ \ | | |
| |\  \ |_| | |_) |  __/ |\  \  __/ |_| |
|_| \_/\__,_|_.__/ \___\_| \_/\___|\__, |
                                    __/ |
                                   |___/

13:39:30 CST [GreetingsModule] Greetings
13:39:30 CST message: [k3s-master]
Greetings, KubeKey!
...
14:08:40 CST success: [k3s-master]
14:08:40 CST Pipeline[CreateClusterPipeline] execute successfully
Installation is complete.
```

The installation is complete. Check if the installation is normal with the following commands.

```bash
> kubectl logs -n kubesphere-system $(kubectl get pod -n kubesphere-system -l 'app in (ks-install, ks-installer)' -o jsonpath='{.items[0].metadata.name}') -f
> export KUBECONFIG=/etc/kubernetes/admin.conf
> kubectl get event -A -w
> kubectl get pod -A -w
> kubectl get sc
```

Access the KubeSphere console, the interface is as follows:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-install-master.png)

## Worker Nodes

Execute on server nodes 10.2.2.140 and 10.2.2.211:

```bash
> export KKZONE=cn
> rsync -aAvz -e 'ssh -p 22' 10.2.2.109:/root/k3s /root/
> cd k3s
> vim config-init.yaml
# Modify key contents
spec:
  hosts:
  - {name: k3s-master, address: 10.2.2.109, internalAddress: 10.2.2.109, user: root, password: "k3s-master@123"}
  - {name: k3s-worker-01, address: 10.2.2.140, internalAddress: 10.2.2.140, user: root, password: "k3s-worker01@123"}
  - {name: k3s-worker-02, address: 10.2.2.211, internalAddress: 10.2.2.211, user: root, password: "k3s-worker02@123"}
  roleGroups:
    etcd:
    - k3s-master
    control-plane:
    - k3s-master
    worker:
    - k3s-master
    - k3s-worker-01
    - k3s-worker-02
```

Install using KubeKey.

```bash
> ./kk add nodes -f config-init.yaml

_   __      _          _   __
| | / /     | |        | | / /
| |/ / _   _| |__   ___| |/ /  ___ _   _
|    \| | | | '_ \ / _ \    \ / _ \ | | |
| |\  \ |_| | |_) |  __/ |\  \  __/ |_| |
|_| \_/\__,_|_.__/ \___\_| \_/\___|\__, |
                                    __/ |
                                   |___/

15:26:05 CST [GreetingsModule] Greetings
15:26:05 CST message: [k3s-worker-02]
Greetings, KubeKey!
...
15:35:19 CST Pipeline[AddNodesPipeline] execute successfully
```

Verify the cluster status.

```bash
> kubectl get node,cs
Warning: v1 ComponentStatus is deprecated in v1.19+
NAME                 STATUS   ROLES                  AGE    VERSION
node/k3s-master      Ready    control-plane,worker   108m   v1.24.17
node/k3s-worker-01   Ready    worker                 20m    v1.24.17
node/k3s-worker-02   Ready    worker                 99s    v1.24.17

NAME                                 STATUS    MESSAGE                         ERROR
componentstatus/scheduler            Healthy   ok
componentstatus/controller-manager   Healthy   ok
componentstatus/etcd-0               Healthy   {"health":"true","reason":""}
```

Check the console, the Worker nodes have successfully joined the cluster.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-install-worker.png)

For convenience, it is recommended to modify the NodePort port range. Execute on all server nodes:

```bash
> vim /etc/kubernetes/manifests/kube-apiserver.yaml

  - --service-node-port-range=1-65535

> systemctl daemon-reload
> systemctl restart kubelet
```

## Create NFS Storage Class

Execute on all server nodes:

```bash
> export KUBECONFIG=/etc/kubernetes/admin.conf
> helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

# Create a storage class named data-nfs-client for storing data
> helm install data-nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner --set nfs.server=10.2.1.9 --set nfs.path=/nfs/kubesphere/data --set replicaCount=3 --set storageClass.name=data-nfs-client --set storageClass.provisionerName=nfs-data --set storageClass.accessModes=ReadWriteMany --set nfs.volumeName=data-nfs-root --set image.repository=m.daocloud.io/registry.k8s.io/sig-storage/nfs-subdir-external-provisioner

# Create a storage class named log-nfs-client for storing logs
> helm install log-nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner --set nfs.server=10.2.1.9 --set nfs.path=/nfs/kubesphere/log --set replicaCount=1 --set storageClass.name=log-nfs-client --set storageClass.provisionerName=nfs-log --set storageClass.accessModes=ReadWriteMany --set nfs.volumeName=log-nfs-root --set image.repository=m.daocloud.io/registry.k8s.io/sig-storage/nfs-subdir-external-provisioner

# Create a storage class named config-nfs-client for storing configuration
> helm install config-nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner --set nfs.server=10.2.1.9 --set nfs.path=/nfs/kubesphere/config --set replicaCount=3 --set storageClass.name=config-nfs-client --set storageClass.provisionerName=nfs-config --set storageClass.accessModes=ReadWriteMany --set nfs.volumeName=config-nfs-root --set image.repository=m.daocloud.io/registry.k8s.io/sig-storage/nfs-subdir-external-provisioner

# Set the default storage class to the data disk
> kubectl patch storageclass data-nfs-client -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
storageclass.storage.k8s.io/data-nfs-client patched
```

## Adjust Image Registry Configuration

[DaoCloud](https://github.com/DaoCloud/public-image-mirror) provides a DockerHub acceleration mirror. If you cannot access DockerHub, you can refer to the following code snippet for configuration.

```bash
# Check if K8s uses CONTAINER-RUNTIME as containerd:// or docker://
> kubectl get nodes -o wide
NAME            STATUS   ROLES                  AGE     VERSION    INTERNAL-IP   EXTERNAL-IP   OS-IMAGE                KERNEL-VERSION                 CONTAINER-RUNTIME
k3s-master      Ready    control-plane,worker   3d23h   v1.24.17   10.2.2.109    <none>        CentOS Linux 7 (Core)   3.10.0-1160.119.1.el7.x86_64   containerd://1.6.33
k3s-worker-01   Ready    worker                 3d22h   v1.24.17   10.2.2.140    <none>        CentOS Linux 7 (Core)   3.10.0-1160.119.1.el7.x86_64   containerd://1.6.33
k3s-worker-02   Ready    worker                 3d22h   v1.24.17   10.2.2.211    <none>        CentOS Linux 7 (Core)   3.10.0-1160.119.1.el7.x86_64   containerd://1.6.33

# If use docker
> vim /etc/docker/daemon.json
{
    "registry-mirrors": ["https://docker.m.daocloud.io"]
}
:wq
> sudo systemctl daemon-reload
> sudo systemctl restart docker

# If use containerd
> vim /etc/containerd/config.toml

[plugins]
  [plugins."io.containerd.grpc.v1.cri"]
    ...
    [plugins."io.containerd.grpc.v1.cri".registry]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
          endpoint = ["https://docker.m.daocloud.io"]

> sudo systemctl daemon-reload
> sudo systemctl restart containerd
```
