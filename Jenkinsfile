node {
    stage 'Clone'
    git '/mnt/raid/snarl/repos/fafail.git'

    stage 'Fetch deps'
    sh './fetch-dependencies.sh'

    stage 'Build'
    dir('site') {
        sh 'gulp'
    }

    stage 'Deploy to dev'
    dir('site/dist') {
        sh 'rm -rf /var/www/html/fafail/*'
        sh 'cp -rv * /var/www/html/fafail'
    }

    dir('server') {
        sh 'rm -rf /var/lib/quizz-server/*'
        sh 'cp -rv * /var/lib/quizz-server/'
        sh 'sudo cp quizz-remote-server.service /etc/systemd/'
        sh 'sudo service quizz-remote-server restart'
    }

    stage 'Deploy to prod'
    input 'Deploy to production ?'
    sshagent(['b114e186-3eb1-495c-afcc-c6c6bbad59fd']) {
        dir('site/dist') {
            sh 'scp -r * jenkins@painful.pics:/var/www/html'
        }

        dir('server') {
            sh 'scp -r * jenkins@painful.pics:/var/lib/quizz-server/'
            sh 'ssh jenkins@painful.pics "sudo cp /var/lib/quizz-server/quizz-remote-server.service /etc/systemd/"'
            sh 'ssh jenkins@painful.pics "sudo service quizz-remote-server restart"'
        }
    }
}
