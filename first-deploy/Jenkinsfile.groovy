def project_token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'

properties([
    gitLabConnection('your-gitlab-connection-name'),
    pipelineTriggers([
        [
            $class: 'GitLabPushTrigger',
            branchFilterType: 'All',
            triggerOnPush: true,
            triggerOnMergeRequest: true,
            triggerOpenMergeRequestOnPush: "never",
            triggerOnNoteRequest: true,
            noteRegex: "Jenkins please retry a build",
            skipWorkInProgressMergeRequest: true,
            secretToken: project_token,
            ciSkip: false,
            setBuildDescription: true,
            addNoteOnMergeRequest: true,
            addCiMessage: true,
            addVoteOnMergeRequest: true,
            acceptMergeRequestOnSuccess: true,
            branchFilterType: "NameBasedFilter",
            includeBranchesSpec: "",
            excludeBranchesSpec: "",
        ]
    ])
])

pipeline {
    agent any
    
    environment {
        buildNum = "${env.BUILD_NUMBER}"
        branchName = "${env.BRANCH_NAME}"
        REGISTRY = "192.168.56.12:5000"
        USER = "admin"
        PASSWORD = "lab_pswd"
        DB_SERVER = "192.168.56.13"
        
        
    }

    stages {

        stage('GET PROJECT') {
            steps {
                git branch: "${branchName}", url: 'http://192.168.56.10/devops-project/deploy-all.git'
            }
        }
 
     
        
        stage('clone services') {
            steps {
                dir('task-srvc') {
                    git branch: "${branchName}", url: 'http://192.168.56.10/devops-project/task-srvc.git'  //URL git du task-service
                }

                dir('authentification-srvc') {
                    git branch: "${branchName}", url: 'http://192.168.56.10/devops-project/authentification-srvc.git' //URL git du authentification-service
                }

                dir('frontend-srvc') {
                    git branch: "${branchName}", url: 'http://192.168.56.10/devops-project/frontend-srvc.git' //URL git du frontend service
                }
            }
        }

        ///////////////// TEST UNITAIRE /////////////////////////////////////////////////////

        stage('TEST UNITAIRE AUTHENTIFICATION-SRVC'){
            steps {
                sh """
                docker run --rm \
                --name test-authentification-srvc \
                -v "\$(pwd)"/authentification-srvc:/usr/src/app \
                -v /var/lib/jenkins/npm/:/root/.npm \
                -w /usr/src/app \
                node:22-alpine \
                sh -c "npm install && npm test"
                """
            }
        }
         
        stage('TEST UNITAIRE TASK-SERVICE with modif'){
            steps {
                sh """
                docker run --rm \
                --name test-task-srvc \
                -v "\$(pwd)"/task-srvc:/usr/src/app \
                -v /var/lib/jenkins/npm/:/root/.npm \
                -w /usr/src/app \
                node:22-alpine \
                sh -c "npm install && npm test"
                """
            }
        }

        
        //////////////// VARIABLE PREPARATION //////////////////////////////////////////////
        stage('Detect trigger') {
            steps {
                script {

                    // Cas 1 : TAG sur main
                    if (env.BRANCH_NAME == 'main') {
                        def lastTag = sh(script: 'git describe --tags --abbrev=0', returnStdout: true).trim()
                        env.VERSION_TAG = lastTag
                        env.DB_NAME = "taskmanager_prod"
                        env.DB_USER = "taskmanager_prod_user"
                        env.DB_PSWD = "pswd_prod"
                        env.KUBECONFIG_CRED = 'k3s-prod-kubeconfig'
                    }

                    // Cas 2 : push sur stage
                    else if (env.BRANCH_NAME == 'stage') {
                        echo "Build déclenché sur la branche stage"
                        env.VERSION_TAG = "test-V${env.BUILD_NUMBER}"
                        env.DB_NAME = "taskmanager_staging"
                        env.DB_USER = "taskmanager_staging_user"
                        env.DB_PSWD = "pswd_staging"
                        env.KUBECONFIG_CRED = 'k3s-staging-kubeconfig'

                    }

                    echo "VERSION = ${env.VERSION_TAG}"
                    sh """ export VERSION_TAG=${env.VERSION_TAG} """
                    sh "export DB_USER=${env.DB_USER}"
                    sh "export DB_NAME=${env.DB_NAME}"
                    sh "export DB_PSWD=${env.DB_PSWD}"
                    sh "KUBECONFIG_CRED=${KUBECONFIG_CRED}"
                }
            }
        }

        stage('Docker login') {
            steps {
                sh '''
                    echo $PASSWORD | docker login $REGISTRY -u $USER --password-stdin
                '''
            }
        }

        stage('DOCKER-COMPOSE BUILD-PUSH') { 
            steps {
                
                sh "docker-compose build"
                sh "docker-compose push"
                sh "docker-compose down --rmi local"
            }
        }

        stage('LIST IMAGE ON REGISTRY') {
            steps {
                sh "curl -u $USER:$PASSWORD http://192.168.56.12:5000/v2/_catalog"
            }
        }

        stage('Init Database') {
            steps {
                sh """
                    mysql -h $DB_SERVER -u $DB_USER -p$DB_PSWD $DB_NAME < sql/init.sql
                """
            }
        }

        
        stage('GET manifest-K3s') {
            steps {
                git branch: 'main', url: 'http://192.168.56.10/devops-project/manifest-k3s.git'
            }
        }

        stage('Deploy to K3s Staging') {
            steps {
                withKubeConfig([credentialsId: "${KUBECONFIG_CRED}"]) {
                    sh '''
                        kubectl create namespace task-app --dry-run=client -o yaml | kubectl apply -f -
                        envsubst '${DB_SERVER},${DB_USER},${DB_NAME}' < cm-app.yaml.template > cm-app.yaml
                        envsubst '${DB_PSWD}' < secret-db.yaml.template > secret-db.yaml
                        kubectl apply -f cm-app.yaml
                        kubectl apply -f secret-db.yaml

                        envsubst '${REGISTRY},${VERSION_TAG}' < auth-deploy/deploy-auth.yaml.template > auth-deploy/deploy-auth.yaml
                        envsubst '${REGISTRY},${VERSION_TAG}' < task-deploy/deploy-task.yaml.template > task-deploy/deploy-task.yaml
                        envsubst '${REGISTRY},${VERSION_TAG}' < frontend-deploy/deploy-frontend.yaml.template > frontend-deploy/deploy-frontend.yaml

                        kubectl apply -f auth-deploy/
                        kubectl apply -f task-deploy/
                        kubectl apply -f frontend-deploy/
                        kubectl apply -f middleware.yaml
                        kubectl apply -f ingress.yaml
                    '''
                }
            }
        }
  
    }

    post {
        always {
            cleanWs()
        }
    }

    
}  