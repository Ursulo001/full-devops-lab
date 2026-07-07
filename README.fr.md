# 🚀 Todo Task Manager — Lab DevOps Complet

[![Vagrant](https://img.shields.io/badge/Vagrant-VirtualBox-1868F2?logo=vagrant&logoColor=white)]()
[![Ansible](https://img.shields.io/badge/Ansible-2.14%2B-EE0000?logo=ansible&logoColor=white)]()
[![Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939?logo=jenkins&logoColor=white)]()
[![GitLab CE](https://img.shields.io/badge/SCM-GitLab%20CE-FC6D26?logo=gitlab&logoColor=white)]()
[![K3s](https://img.shields.io/badge/Orchestration-K3s-326CE5?logo=kubernetes&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Registry-Docker%20privé-2496ED?logo=docker&logoColor=white)]()

> 🇬🇧 [Read this README in English](./README.en.md)

## 📌 Vue d'ensemble

Ce dépôt documente un **lab DevOps de bout en bout**, construit entièrement à la main : de la création des machines virtuelles jusqu'au déploiement continu d'une application microservices sur Kubernetes (K3s), en passant par le provisionnement automatisé (Ansible), l'intégration continue (Jenkins) et un registre Docker privé.

L'application déployée est un **Task Manager** en architecture microservices :

- **auth-service** — authentification (Express.js)
- **task-service** — gestion des tâches / CRUD (Express.js)
- **frontend** — interface utilisateur (Vite + React)
- **MySQL** — base de données

Tests unitaires réalisés avec **Jest**.

---

## 🏗️ Architecture du lab

Toutes les machines communiquent sur un réseau privé `192.168.56.0/24` (host-only VirtualBox) :

```
                         ┌─────────────────────────┐
                         │   192.168.56.0/24        │
                         │   (réseau host-only)     │
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

- **GitLab CE** héberge le code source, déclenche des **webhooks** vers Jenkins à chaque push.
- **Jenkins** exécute les pipelines multibranches (build, test, push image, déploiement).
- **Registry** est un registre Docker privé, sécurisé par authentification (`htpasswd` via `httpd:2`).
- **Staging** et **Production** sont deux clusters K3s distincts, alimentés en images depuis le registre privé.

---

## 📦 Structure des dépôts

Le projet est volontairement **découpé en plusieurs dépôts indépendants** (plutôt qu'un monorepo), pour refléter des pratiques DevOps réelles : déploiement ciblé, CI/CD indépendante par service, séparation claire des responsabilités.

| Dépôt | Rôle | Contenu principal |
|---|---|---|
| `ansible_provisionning-server` | Provisionnement infra | Playbooks Ansible (Jenkins, GitLab, K3s, Docker, registry, MySQL) |
| `deploy-all` | Déploiement global / bootstrap | `docker-compose.yml`, `Jenkinsfile.groovy`, `sql/init.sql` |
| `authentification-srvc` | Microservice d'authentification | `app.js`, `Dockerfile`, `k3s/`, `__tests__/` |
| `task-srvc` | Microservice de gestion des tâches | `app.js`, `Dockerfile`, `k3s/`, `__tests__/` |
| `frontend-srvc` | Interface utilisateur | Vite + React, `Dockerfile`, `k3s/` |
| `manifest-k3s` | Manifestes Kubernetes centralisés | Templates `.yaml.template`, `ingress.yaml`, `middleware.yaml` |

Chaque dépôt applicatif (`authentification-srvc`, `task-srvc`, `frontend-srvc`) possède **deux branches** :

- `stage` → déploiement automatique vers le serveur de **staging**
- `main` → déploiement automatique vers le serveur de **production** (nécessite un **tag de version**)

---

## 🧰 Stack technique

| Catégorie | Technologie |
|---|---|
| Virtualisation | Vagrant + VirtualBox |
| Provisionnement | Ansible ≥ 2.14 |
| CI/CD | Jenkins (multibranch pipeline) + Kubernetes CLI Plugin |
| SCM | GitLab CE (webhooks) |
| Orchestration | K3s (Kubernetes léger) |
| Reverse proxy / Ingress | Traefik (routing par chemin, `stripPrefix`) |
| Registre d'images | Registre Docker privé (auth via `htpasswd`) |
| Backend | Node.js / Express.js |
| Frontend | Vite + React |
| Base de données | MySQL |
| Tests | Jest |

---

## ⚙️ 1. Provisionnement des machines virtuelles (Vagrant)

```
VR_server
├── database/Vagrantfile
├── gitlab/Vagrantfile
├── jenkins/Vagrantfile
├── prod-server/Vagrantfile
├── registry/Vagrantfile
└── stage/Vagrantfile
```

Chaque `Vagrantfile` définit l'OS, la RAM, le CPU, l'IP et les ports ouverts du serveur correspondant.

```bash
vagrant up          # créer une VM
vagrant ssh          # se connecter en SSH à la VM
vagrant ssh-config    # récupérer la config SSH (utile pour Ansible)
```

---

## 🔧 2. Provisionnement automatisé (Ansible)

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
    ├── install-postgresql   # rôle générique conservé, non utilisé en prod
    └── install-registry
```

### Prérequis

- Ansible ≥ 2.14
- Accès SSH aux hôtes cibles
- Python 3 sur les hôtes cibles

### Commandes utiles

```bash
# Vérifier l'inventaire
ansible-inventory -i inventory.yml --list
ansible all -i inventory.yml -m ping

# Déployer un service précis
ansible-playbook -i inventory.yml playbook-jenkins.yml
ansible-playbook -i inventory.yml playbook-gitlab.yml
ansible-playbook -i inventory.yml playbook-database.yml
ansible-playbook -i inventory.yml playbook-registry.yml

# Déployer un environnement complet
ansible-playbook -i inventory.yml playbook-stage.yml
ansible-playbook -i inventory.yml playbook-prod.yml

# Dry-run
ansible-playbook -i inventory.yml playbook-prod.yml --check
```

### Bases de données

Le rôle `install-createDB-mysql` provisionne **deux bases de données MySQL distinctes**, une par environnement :

- une base dédiée au serveur de **staging**
- une base dédiée au serveur de **production**

Cette séparation évite toute interférence entre les données de test et les données réelles, et permet de valider les migrations (`init.sql`) en staging avant de les rejouer en production.

### Décisions techniques

- **K3s** choisi pour sa faible empreinte RAM et sa viabilité en production sur du matériel modeste.
- **Deux bases MySQL séparées (stage/prod)** provisionnées automatiquement par Ansible, garantissant l'isolation des environnements.
- **Registre Docker privé** : authentification configurée côté containerd (`registries.yaml`), distincte de `daemon.json` côté Docker classique.
- **Playbooks séparés par service** : déploiement ciblé et debug plus rapide qu'un playbook monolithique.
- **`playbook-stage.yml` / `playbook-prod.yml`** : orchestrateurs qui appellent les playbooks unitaires avec des variables différenciées selon l'environnement.

---

## 🔁 3. CI/CD — Jenkins & GitLab CE

### Configuration GitLab

1. Connexion à GitLab CE via son IP (`http://192.168.56.12`)
2. Création d'un utilisateur → d'un groupe → d'un projet
3. Création des dépôts nécessaires au déploiement (voir [Structure des dépôts](#-structure-des-dépôts))

### Configuration Jenkins

Jenkins est accessible via `http://192.168.56.11`.

Pour chaque dépôt (`deploy-all`, `task-srvc`, `authentification-srvc`, `frontend-srvc`) :

1. Créer un item de type **Multibranch Pipeline**
2. Renseigner l'URL du dépôt GitLab
3. Spécifier le nom du fichier de pipeline : `Jenkinsfile.groovy`
4. Jenkins détecte automatiquement chaque branche contenant ce fichier et exécute le pipeline correspondant

### Webhook GitLab → Jenkins

Dans chaque dépôt GitLab : **Settings → Webhooks → Add new webhook**

- **URL** : URL du webhook Jenkins
- **Secret Token** : identique à celui déclaré dans `Jenkinsfile.groovy`
- **Événements** : `Push Events`
- **Option** : `All Branches` activée

À chaque push, GitLab notifie Jenkins qui déclenche automatiquement le pipeline de la branche concernée.

### Stratégie de branches

| Branche | Déclenche | Environnement | Condition |
|---|---|---|---|
| `stage` | Pipeline automatique | Serveur de staging | Aucune |
| `main` | Pipeline automatique | Serveur de production | Tag de version requis |

---

## 🐳 4. Registre Docker privé & intégration K3s

### Configuration Jenkins → Registry

Sur le serveur Jenkins, dans `/etc/docker/daemon.json` :

```json
{
  "insecure-registries": ["192.168.56.12:5000"],
  "debug": true
}
```

```bash
sudo docker login <URL-registry>
```

### Configuration K3s → Registry (staging & prod)

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

### Intégration kubectl dans Jenkins

```bash
# 1. Récupérer le kubeconfig depuis le serveur de staging
sudo cat /etc/rancher/k3s/k3s.yaml
sudo sed -i 's/127.0.0.1/192.168.56.14/' /etc/rancher/k3s/k3s.yaml
scp vagrant@192.168.56.14:/etc/rancher/k3s/k3s.yaml ./srvstaging-kubeconfig.yaml

# 2. Installer kubectl sur l'agent Jenkins
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

Dans Jenkins : **Manage Jenkins → Credentials → Add Credentials**
- Type : `Secret file`
- Fichier : `srvstaging-kubeconfig.yaml`
- ID : `k3s-staging-kubeconfig`

Plugin requis : **Kubernetes CLI Plugin** (fournit `withKubeConfig`).

---

## 📄 5. Déploiement Kubernetes — `manifest-k3s`

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

- Les fichiers `.yaml.template` sont traités via `envsubst` avant `kubectl apply`, ce qui permet d'injecter dynamiquement les variables d'environnement propres à chaque environnement (stage/prod).
- Routage **Traefik** basé sur les chemins (`/`, `/auth-api`, `/task-api`) avec un `Middleware` de type `stripPrefix`.
- Tous les services exposés en `ClusterIP`, avec un point d'entrée unique via l'Ingress.

---

## 🧩 Défis techniques & décisions

Cette section documente les problèmes réels rencontrés — et comment ils ont été résolus.

- **Erreur TLS / SAN K3s** : le certificat K3s ne reconnaissait pas l'IP du serveur de staging. Résolu en ajoutant une entrée `tls-san` dans `/etc/rancher/k3s/config.yaml` puis en supprimant `/var/lib/rancher/k3s/server/tls` pour forcer la régénération des certificats.
- **Authentification au registre privé** : Docker (`daemon.json`) et containerd/K3s (`registries.yaml`) ont des mécanismes d'authentification totalement séparés — la configuration doit être dupliquée dans les deux formats.
- **Pipelines par service plutôt qu'un pipeline monolithique** : chaque microservice a son propre `Jenkinsfile.groovy`, permettant des mises à jour indépendantes sans redéployer l'ensemble de la stack.
- **Séparation stage/main** : la logique de déploiement diffère selon la branche directement dans le `Jenkinsfile.groovy`, avec exigence de tag pour tout déploiement en production.
- **Dépôts multiples vs monorepo** : choix assumé pour refléter des pratiques professionnelles réelles (CI/CD indépendante, permissions granulaires, historique Git plus lisible par service).

---

## 🚦 Démarrage rapide

```bash
# 1. Provisionner les VMs
cd VR_server/<service> && vagrant up

# 2. Provisionner les serveurs avec Ansible
cd ansible_provisionning-server
ansible-playbook -i inventory.yml playbook-stage.yml

# 3. Configurer GitLab (utilisateur, groupe, projets, dépôts)

# 4. Configurer Jenkins (multibranch pipelines + credentials K3s)

# 5. Pousser du code sur la branche `stage` → déploiement auto en staging
# 6. Après validation, merger sur `main` + tag → déploiement auto en production
```

---

## 🗺️ Roadmap

- [ ] Observabilité (Prometheus + Grafana) — **prévu comme projet séparé**, non intégré à ce lab pour le moment.
- [ ] Ajout de tests d'intégration end-to-end.
- [ ] Durcissement sécurité (scan d'images, secrets management).

---

## 👤 Auteur

Projet réalisé et documenté par **Ursulo**, dans le cadre d'un lab DevOps personnel visant des postes SysAdmin/DevOps/SRE junior en remote.
