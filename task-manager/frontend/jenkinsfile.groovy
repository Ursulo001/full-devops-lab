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
                git branch: "${branchName}", url: 'http://192.168.56.10/devops-project/frontend-srvc.git'
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
                    sh "export VERSION_TAG=${env.VERSION_TAG}"
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


        stage('Deploy to K3s Staging') {
            steps {
                withKubeConfig([credentialsId: "${KUBECONFIG_CRED}"]) {
                    sh '''
                        envsubst '${REGISTRY},${VERSION_TAG}' < k3s/deploy-frontend.yaml.template > k3s/deploy-frontend.yaml

                        kubectl apply -f k3s/deploy-frontend.yaml
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