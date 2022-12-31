node {
    def application = "GruntApp"
    def dockerhubacc = "anurag2000"

    stage('Clone Repo'){
        checkout scm
    }

    stage('Build Image'){
        app = docker.build("${dockerhubacc}/${application}:${BUILD_IMAGE}")
    }

    stage('Push Image'){
        withDockerRegistry([ credentialsId: "Dockerhub_Account", url: "" ]){
            app.push()
        }
    }

    stage('Deploy'){
        sh('docker run -d -p 1880:1880 -v /var/log/:/var/log/ ${dockerhubacc}/${application}:${BUILD_NUMBER}')
    }

      stage('Remove old images') {
		sh("docker rmi ${dockerhubaccount}/${application}:latest -f")
    }
}