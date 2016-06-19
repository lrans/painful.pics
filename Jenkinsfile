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
}
