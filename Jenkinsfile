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

    stage 'Deploy to prod'
    dir('site/dist') {
        input 'Deploy to production ?'
        sshagent(['b114e186-3eb1-495c-afcc-c6c6bbad59fd']) {
            sh 'scp -r * jenkins@painful.pics:/var/www/html'
        }
    }
}
