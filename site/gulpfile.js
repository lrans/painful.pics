var gulp = require('gulp');

// Include plugins
var g = require("gulp-load-plugins")({
    pattern: ['gulp-*', 'gulp.*', 'main-bower-files', 'ordered-merge-stream', 'git-rev'],
    replaceString: /\bgulp[\-.]/
});

var bases = {
    app: 'app/',
    dist: 'dist/'
};

var paths = {
    scripts: ['scripts/**/*.js', '!scripts/libs/**/*.js', '!scripts/remote.js'],
    styles: ['styles/**/*.css', '!styles/remote.css'],
    html: ['html/**/*.html'],
    images: ['images/**/*.png'],
    extras: ['extras/proxy.jar'],
    sounds: ['sounds/**/*.mp3'],
    templates: ['templates/**/*.hbs']
};

// Delete the dist directory
gulp.task('clean', function() {
    return gulp.src(bases.dist)
        .pipe(g.clean());
});

function uglifyIfNeeded() {
    return g.util.env.env === 'local' ? g.util.noop() : g.uglify();
}

// Process scripts and concatenate them into one output file
gulp.task('scripts', function() {
    var jQueryAndLibs = [
        'tmp/bower_components/jquery/dist/jquery.js',
        'tmp/bower_components/socket.io-client/socket.io.js',
		'node_modules/tidy-html5/tidy.js'
    ].concat(g.mainBowerFiles(['**/*.js', '!tmp/bower_components/jquery/dist/jquery.js']))
	.concat(['tmp/bower_components/uikit/js/components/tooltip.js']);
    var libs = gulp.src(jQueryAndLibs)
        .pipe(g.debug({title: 'including lib:'}));
    libs.pause();

    var app = gulp.src(paths.scripts, {cwd: bases.app})
        .pipe(g.jshint())
        .pipe(g.jshint.reporter('default'));
    app.pause();

    var templates = gulp.src(paths.templates, {cwd: bases.app})
        .pipe(g.handlebars({
                handlebars: require('handlebars')
        }))
        .pipe(g.wrap('Handlebars.template(<%= contents %>)'))
        .pipe(g.declare({
            namespace: 'tools.templates',
            noRedeclare: true // Avoid duplicate declarations
        }));
    templates.pause();

    var localOverrides = (g.util.env.env === 'local' ? ['app/scripts/tools-local-override.js'] : []);
    var local = gulp.src(localOverrides);
    local.pause();

	g.gitRev.short(function (rev) {
		g.orderedMergeStream([libs, templates, app, local])
			.pipe(uglifyIfNeeded())
			.pipe(g.concat('app.' + rev + '.min.js'))
			.pipe(gulp.dest(bases.dist + 'js/'));
	});

    var mobileLibs = gulp.src([
        'tmp/bower_components/jquery/dist/jquery.js',
		'tmp/bower_components/jquery-modal/jquery.modal.js',
        'tmp/bower_components/socket.io-client/socket.io.js',
        'tmp/bower_components/handlebars/handlebars.min.js',
        'tmp/bower_components/uikit/js/uikit.min.js',
        'tmp/bower_components/jquery-qrcode/jquery.qrcode.min.js'
    ]).pipe(g.debug({title: 'including lib:'}));
    mobileLibs.pause();

    var mobileTemplates = gulp.src([
        'templates/players-list.hbs',
        'templates/quizz-answers.hbs',
        'templates/lobby-modal.hbs',
		'templates/message-modal.hbs'
    ], {cwd: bases.app})
        .pipe(g.handlebars({
            handlebars: require('handlebars')
        }))
        .pipe(g.wrap('Handlebars.template(<%= contents %>)'))
        .pipe(g.declare({
            namespace: 'tools.templates',
            noRedeclare: true // Avoid duplicate declarations
        }));
    mobileTemplates.pause();

    var mobileApp = gulp.src([
        'scripts/tools.js',
        'scripts/remote.js'
    ], {cwd: bases.app})
        .pipe(g.jshint())
        .pipe(g.jshint.reporter('default'));
    mobileApp.pause();

    var mobileLocalOverrides = (g.util.env.env === 'local' ? ['app/scripts/tools-local-override.js'] : []);
    var mobileLocal = gulp.src(mobileLocalOverrides);
    mobileLocal.pause();

	g.gitRev.short(function (rev) {
		g.orderedMergeStream([mobileLibs, mobileTemplates, mobileApp, mobileLocal])
			.pipe(uglifyIfNeeded())
			.pipe(g.concat('app-remote.' + rev + '.min.js'))
			.pipe(gulp.dest(bases.dist + 'js/'));
	});
});

// Process styles and concatenate them into one output file
gulp.task('styles', function() {

    var vendorStyles = [
        'tmp/bower_components/jquery-modal/jquery.modal.css',
        'tmp/bower_components/uikit/css/uikit.almost-flat.min.css',
        'tmp/bower_components/uikit/css/components/progress.almost-flat.min.css',
		'tmp/bower_components/uikit/css/components/tooltip.almost-flat.min.css'
    ];
    var libs = gulp.src(vendorStyles);
    libs.pause();

    var app = gulp.src([
        'app/styles/fafail.css',
        'app/styles/quizz.css',
        'app/styles/flash.css'
    ]);
    app.pause();

	g.gitRev.short(function (rev) {
		g.orderedMergeStream([libs, app])
			.pipe(g.cleanCss())
			.pipe(g.concat('app.' + rev + '.min.css'))
			.pipe(gulp.dest(bases.dist + 'css/'));
	});

    var mobileLibs = gulp.src(vendorStyles);
    mobileLibs.pause();

    var mobileApp = gulp.src([
        'app/styles/fafail.css',
        'app/styles/quizz.css',
        'app/styles/flash.css',
        'app/styles/remote.css'
    ]);
    mobileApp.pause();

	g.gitRev.short(function (rev) {
		g.orderedMergeStream([mobileLibs, mobileApp])
			.pipe(g.cleanCss())
			.pipe(g.concat('app-remote.' + rev + '.min.css'))
			.pipe(gulp.dest(bases.dist + 'css/'));
	});

});

// Process images
gulp.task('images', function() {
    var app = gulp.src(paths.images, {cwd: bases.app})
        .pipe(g.imagemin())
        .pipe(gulp.dest(bases.dist + 'img/'));
});

// Copy all other files to dist directly
gulp.task('copy', function() {
	g.gitRev.short(function (rev) {
		// Copy html
		gulp.src(paths.html, {cwd: bases.app})
			.pipe(g.replace('#revision#', rev))
			.pipe(gulp.dest(bases.dist));
	});

    // Copy extra files
    gulp.src(paths.extras, {cwd: bases.app})
        .pipe(gulp.dest(bases.dist));

    // Copy sounds
    gulp.src(paths.sounds, {cwd: bases.app})
        .pipe(gulp.dest(bases.dist + 'sound/'));

	// Copy fonts
	gulp.src([
		'tmp/bower_components/uikit/fonts/*'
	]).pipe(gulp.dest(bases.dist + 'fonts/'));

});

// A development task to run anytime a file changes
gulp.task('watch', function() {
    gulp.watch('app/**/*', ['scripts', 'styles', 'copy']);
});

gulp.task('webserver', function() {
  gulp.src('dist')
    .pipe(g.webserver({
		proxies: [
			{source: '/game', target: 'http://localhost:3000/game'}
		]
    }));
});

// Define the default task as a sequence of the above tasks
gulp.task('default', ['scripts', 'styles', 'images', 'copy']);