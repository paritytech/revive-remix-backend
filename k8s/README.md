## Usage instructions

This document describes how to set up a Minikube cluster with the Revive Remix backend
and enable horizontal scaling based on a custom Prometheus metric.

### Install Minikube and Helm

[Install Minikube](https://minikube.sigs.k8s.io/docs/start/)
[Install helm](https://helm.sh/docs/intro/install/)

### Set up Minikube cluster

Initialize your local Kubernetes cluster with Minikube and install the Prometheus monitoring stack:

```sh
# Start the Minikube cluster
minikube start

# Add the Prometheus community Helm chart repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Update the local Helm chart repository to ensure you have the latest charts
helm repo update

# Install the Kube Prometheus Stack in the default namespace
helm install prometheus prometheus-community/kube-prometheus-stack --namespace default --create-namespace

# Install the Prometheus Adapter for custom metrics support
helm install prometheus-adapter prometheus-community/prometheus-adapter --namespace default --set prometheus.url=http://prometheus-kube-prometheus-prometheus.default.svc.cluster.local
```

### Build and deploy your docker image locally (optional)

```sh
eval $(minikube docker-env)
docker build --platform=linux/amd64 -t paritytech/revive-remix-backend:1.0.0 .

```

### Deploy your application and configure monitoring

```sh
# Apply the deployment configuration
kubectl apply -f deployment.yaml

# Apply the service configuration to expose your application
kubectl apply -f service.yaml

# Configure Prometheus to monitor your application
kubectl apply -f service-monitor.yaml

# Apply the metrics configuration for the Prometheus Adapter
kubectl apply -f adapter-metrics.yaml

# Apply the scaling rules
kubectl apply -f hpa.yaml

```

### Manage Networking and Access

Enable access to your services and manage networking with Minikube:

Enable Minikube tunnel

```sh
minikube tunnel
```

Enable Port-Forwarding for the Prometheus service

```sh
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
```
