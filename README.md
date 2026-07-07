# 🚀 Todo Task Manager — Full DevOps Lab

[![Vagrant](https://img.shields.io/badge/Vagrant-VirtualBox-1868F2?logo=vagrant&logoColor=white)]()
[![Ansible](https://img.shields.io/badge/Ansible-2.14%2B-EE0000?logo=ansible&logoColor=white)]()
[![Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939?logo=jenkins&logoColor=white)]()
[![GitLab CE](https://img.shields.io/badge/SCM-GitLab%20CE-FC6D26?logo=gitlab&logoColor=white)]()
[![K3s](https://img.shields.io/badge/Orchestration-K3s-326CE5?logo=kubernetes&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Registry-Private%20Docker-2496ED?logo=docker&logoColor=white)]()

> 🇫🇷 [Lire ce README en français](./README.fr.md)

## 📌 Overview

This repository documents an **end-to-end DevOps lab**, built entirely from scratch: from spinning up virtual machines to continuously deploying a microservices application on Kubernetes (K3s), including automated provisioning (Ansible), continuous integration (Jenkins), and a private Docker registry.

The deployed application is a **Task Manager**, built as a microservices architecture:

- **auth-service** — authentication (Express.js)
- **task-service** — task management / CRUD (Express.js)
- **frontend** — user interface (Vite + React)
- **MySQL** — database

Unit tests are written with **Jest**.

---

## 🏗️ Lab Architecture

All machines communicate over a private `192.168.56.0/24` network (VirtualBox host-only):

```
                         ┌─────────────────────────┐
                         │   192.168.56.0/24        │
                         │   (host-only network)    │
                         └─────────────────────────┘
     ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌────────────┐
     │  GitLab CE │   │  Jenkins  │   │  Registry │   │  Database  │
     │ .12        │   │ .11       │   │ Docker    │   │  MySQL     │
     └───────────┘   └───────────┘   └───────────┘   └────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          ┌─────────────┐           ┌─────────────┐
          │   Staging    │           │  Production │
          │ K3s .14      │           │  K3s        │
          └─────────────┘           └─────────────┘
```

- **GitLab CE** hosts the source code and triggers **webhooks** to Jenkins on every push.
- **Jenkins** runs multibranch pipelines (build, test, image push, deployment).
- **Registry** is a private Docker registry secured with authentication (`htpasswd` via `httpd:2`).
- **Staging** and **Production** are two separate K3s clusters, both pulling images from the private registry.

---

## 📦 Repository Structure

The project is deliberately **split across multiple independent repositories** (rather than a monorepo), to reflect real-world DevOps practices: targeted deployments, independent CI/CD per service, and clear separation of concerns.

| Repository | Role | Main content |
|---|---|---|
| `ansible_provisionning-server` | Infrastructure provisioning | Ansible playbooks (Jenkins, GitLab, K3s, Docker, registry, MySQL) |
| `deploy-all` | Global deployment / bootstrap | `docker-compose.yml`, `Jenkinsfile.groovy`, `sql/init.sql` |
| `authentification-srvc` | Authentication microservice | `app.js`, `Dockerfile`, `k3s/`, `__tests__/` |
| `task-srvc` | Task management microservice | `app.js`, `Dockerfile`, `k3s/`, `__tests__/` |
| `frontend-srvc` | User interface | Vite + React, `Dockerfile`, `k3s/` |
| `manifest-k3s` | Centralized Kubernetes manifests | `.yaml.template` files, `ingress.yaml`, `middleware.yaml` |

Each application repository (`authentification-srvc`, `task-srvc`, `frontend-srvc`) has **two branches**:

- `stage` → automatically deployed to the **staging** server
- `main` → automatically deployed to the **production** server (requires a **version tag**)

---

## 🧰 Tech Stack

| Category | Technology |
|---|---|
| Virtualization | Vagrant + VirtualBox |
| Provisioning | Ansible ≥ 2.14 |
| CI/CD | Jenkins (multibranch pipeline) + Kubernetes CLI Plugin |
| SCM | GitLab CE (webhooks) |
| Orchestration | K3s (lightweight Kubernetes) |
| Reverse proxy / Ingress | Traefik (path-based routing, `stripPrefix`) |
| Image registry | Private Docker registry (`htpasswd` auth) |
| Backend | Node.js / Express.js |
| Frontend | Vite + React |
| Database | MySQL |
| Testing | Jest |

---

## ⚙️ 1. Virtual Machine Provisioning (Vagrant)

```
VR_server
├── database/Vagrantfile
├── gitlab/Vagrantfile
├── jenkins/Vagrantfile
├── prod-server/Vagrantfile
├── registry/Vagrantfile
└── stage/Vagrantfile
```

Each `Vagrantfile` defines the OS, RAM, CPU, IP, and open ports for the corresponding server.

```bash
vagrant up          # create a VM
vagrant ssh          # SSH into the VM
vagrant ssh-config    # retrieve SSH config (used by Ansible)
```

---

## 🔧 2. Automated Provisioning (Ansible)

```
ansible_provisionning-server
├── group_vars/all.yml
├── inventory.yml
├── playbook-database.yml
├── playbook-gitlab.yml
├── playbook-jenkins.yml
├── playbook-prod.yml
├── playbook-registry.yml
├── playbook-stage.yml
└── roles/
    ├── install-createDB-mysql
    ├── install-docker
    ├── install-gitlab
    ├── install-jenkins
    ├── install-k3s
    ├── install-postgresql   # generic role kept for reuse, not used in production
    └── install-registry
```

### Requirements

- Ansible ≥ 2.14
- SSH access to target hosts
- Python 3 on target hosts

### Useful commands

```bash
# Check the inventory
ansible-inventory -i inventory.yml --list
ansible all -i inventory.yml -m ping

# Deploy a specific service
ansible-playbook -i inventory.yml playbook-jenkins.yml
ansible-playbook -i inventory.yml playbook-gitlab.yml
ansible-playbook -i inventory.yml playbook-database.yml
ansible-playbook -i inventory.yml playbook-registry.yml

# Deploy a full environment
ansible-playbook -i inventory.yml playbook-stage.yml
ansible-playbook -i inventory.yml playbook-prod.yml

# Dry-run
ansible-playbook -i inventory.yml playbook-prod.yml --check
```

### Databases

The `install-createDB-mysql` role provisions **two separate MySQL databases**, one per environment:

- one database dedicated to the **staging** server
- one database dedicated to the **production** server

This separation prevents any interference between test data and real data, and allows migrations (`init.sql`) to be validated in staging before being replayed in production.

### Technical decisions

- **K3s** was chosen for its low RAM footprint and production viability on modest hardware.
- **Two separate MySQL databases (stage/prod)** automatically provisioned by Ansible, ensuring environment isolation.
- **Private Docker registry**: authentication is configured on the containerd side (`registries.yaml`), separate from the classic Docker `daemon.json`.
- **Per-service playbooks**: enables targeted deployment and faster debugging compared to a monolithic playbook.
- **`playbook-stage.yml` / `playbook-prod.yml`**: orchestrators that call unit playbooks with environment-specific variables.

---

## 🔁 3. CI/CD — Jenkins & GitLab CE

### GitLab configuration

1. Log into GitLab CE via its IP (`http://192.168.56.12`)
2. Create a user → a group → a project
3. Create the repositories needed for deployment (see [Repository Structure](#-repository-structure))

### Jenkins configuration

Jenkins is accessible at `http://192.168.56.11`.

For each repository (`deploy-all`, `task-srvc`, `authentification-srvc`, `frontend-srvc`):

1. Create a **Multibranch Pipeline** item
2. Point it to the GitLab repository URL
3. Set the pipeline file name to `Jenkinsfile.groovy`
4. Jenkins auto-detects every branch containing this file and runs the matching pipeline

### GitLab → Jenkins webhook

In each GitLab repository: **Settings → Webhooks → Add new webhook**

- **URL**: Jenkins webhook URL
- **Secret Token**: must match the one declared in `Jenkinsfile.groovy`
- **Trigger**: `Push Events`
- **Option**: enable `All Branches`

On every push, GitLab notifies Jenkins, which automatically triggers the pipeline for the relevant branch.

### Branching strategy

| Branch | Triggers | Environment | Condition |
|---|---|---|---|
| `stage` | Automatic pipeline | Staging server | None |
| `main` | Automatic pipeline | Production server | Version tag required |

---

## 🐳 4. Private Docker Registry & K3s Integration

### Jenkins → Registry configuration

On the Jenkins server, in `/etc/docker/daemon.json`:

```json
{
  "insecure-registries": ["192.168.56.12:5000"],
  "debug": true
}
```

```bash
sudo docker login <registry-URL>
```

### K3s → Registry configuration (staging & production)

```bash
sudo tee /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "192.168.56.12:5000":
    endpoint:
      - "http://192.168.56.12:5000"
configs:
  "192.168.56.12:5000":
    auth:
      username: admin
      password: lab_pswd
EOF
sudo systemctl restart k3s
```

### kubectl integration in Jenkins

```bash
# 1. Retrieve the kubeconfig from the staging server
sudo cat /etc/rancher/k3s/k3s.yaml
sudo sed -i 's/127.0.0.1/192.168.56.14/' /etc/rancher/k3s/k3s.yaml
scp vagrant@192.168.56.14:/etc/rancher/k3s/k3s.yaml ./srvstaging-kubeconfig.yaml

# 2. Install kubectl on the Jenkins agent
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

In Jenkins: **Manage Jenkins → Credentials → Add Credentials**
- Type: `Secret file`
- File: `srvstaging-kubeconfig.yaml`
- ID: `k3s-staging-kubeconfig`

Required plugin: **Kubernetes CLI Plugin** (provides `withKubeConfig`).

---

## 📄 5. Kubernetes Deployment — `manifest-k3s`

```
manifest-k3s
├── auth-deploy/
│   ├── deploy-auth.yaml.template
│   └── svc-auth.yaml
├── frontend-deploy/
│   ├── deploy-frontend.yaml.template
│   └── svc-frontend.yaml
├── task-deploy/
│   ├── deploy-task.yaml.template
│   └── svc-task.yaml
├── cm-app.yaml.template
├── secret-db.yaml.template
├── ingress.yaml
└── middleware.yaml
```

- `.yaml.template` files are processed with `envsubst` before `kubectl apply`, allowing environment-specific variables to be injected dynamically (stage/prod).
- **Traefik** handles path-based routing (`/`, `/auth-api`, `/task-api`) via a `stripPrefix` `Middleware`.
- All services are exposed as `ClusterIP`, with a single Ingress entry point.

---

## 🧩 Technical Challenges & Decisions

This section documents the real problems encountered — and how they were solved.

- **K3s TLS/SAN error**: the K3s certificate didn't recognize the staging server's IP. Fixed by adding a `tls-san` entry in `/etc/rancher/k3s/config.yaml`, then removing `/var/lib/rancher/k3s/server/tls` to force certificate regeneration.
- **Private registry authentication**: Docker (`daemon.json`) and containerd/K3s (`registries.yaml`) use entirely separate authentication mechanisms — configuration must be duplicated in both formats.
- **Per-service pipelines instead of a monolithic one**: each microservice has its own `Jenkinsfile.groovy`, enabling independent updates without redeploying the whole stack.
- **Stage/main separation**: deployment logic differs by branch directly inside `Jenkinsfile.groovy`, with a mandatory tag for any production deployment.
- **Multiple repositories vs. monorepo**: a deliberate choice to reflect real-world professional practices (independent CI/CD, granular permissions, cleaner per-service Git history).

---

## 🚦 Getting Started

```bash
# 1. Provision the VMs
cd VR_server/<service> && vagrant up

# 2. Provision the servers with Ansible
cd ansible_provisionning-server
ansible-playbook -i inventory.yml playbook-stage.yml

# 3. Configure GitLab (user, group, projects, repositories)

# 4. Configure Jenkins (multibranch pipelines + K3s credentials)

# 5. Push code to the `stage` branch → automatic deployment to staging
# 6. Once validated, merge to `main` + tag → automatic deployment to production
```

---

## 🗺️ Roadmap

- [ ] Observability (Prometheus + Grafana) — **planned as a separate project**, not integrated into this lab yet.
- [ ] Add end-to-end integration tests.
- [ ] Security hardening (image scanning, secrets management).

---

## 👤 Author

**Ursulo**
