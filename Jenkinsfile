node {
stage 'Clone'
git '/mnt/raid/snarl/repos/fafail.git'

stage 'Fetch deps'
sh 'fetch-dependencies.sh'

stage 'Build'
dir('site') {
  sh 'gulp'
}

}
