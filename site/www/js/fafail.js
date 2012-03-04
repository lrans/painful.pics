/*function getFA() {
    fapi.getRecent(64, function(submission){
        console.log(submission.title);
    })
}*/

var fafail = {};

fafail.submissions = {}
fafail.submissionsQueue = [];
fafail.addSubmission = function(submission) {
    if ($.inArray(submission.id, Object.keys(fafail.submissions)) == -1) {
        fafail.submissions[submission.id] = submission;
        fafail.submissionsQueue.push(submission);
    }
}

fafail.getRecent = function() {
    fapi.getRecent(32, fafail.addSubmission);
    if (fafail.vars.browsing) {
        setTimeout(fafail.getRecent, 10 * 1000);
    }
}

fafail.displayRecent = function() {
    if (fafail.submissionsQueue.length > 0) {
        var submission = fafail.submissionsQueue.shift();
        fafail.showImage(submission);
    }
    if (fafail.vars.browsing) {
        setTimeout(fafail.displayRecent, 0.5 * 1000);
    }
}

fafail.showImage = function(submission) {
    var img = new Image();
    var div = $('<div class="submission" name="' + submission.id + '"></div>');
    $(div).hide();
    $(img).appendTo(div);
    $(img).load(function () {
        var top = Math.floor(Math.random()*($('#show').height() - img.height - 10));
        var left = Math.floor(Math.random()*($('#show').width() - img.width - 10));
        $(div).css('top', top).css('left', left).css('z-index', 990);
        $(div).appendTo('#show').animaDrag({
            interval: 100,
            speed: 400,
            boundary: $('#show'),
            overlay: false,
            after: function() {
                $(div).appendTo('#show');
            }
        }).fadeIn();
    }).attr('src', submission.resource.half);
}

fafail.clearShow = function() {
    fafail.submissions = {}
    fafail.submissionsQueue = [];
    $('#show div.submission').remove();
}

fafail.updateLoginStatus = function () {
    fafail.vars.loggedIn = fapi.getCurrentUser();
    if (fafail.vars.loggedIn) {
        $('img[name="tool-login"]').attr('src', 'img/system-log-out.png').attr('title', 'Logged in as : ' + fafail.vars.loggedIn + ', click to logout');
    } else {
        $('img[name="tool-login"]').attr('src', 'img/view-media-artist.png').attr('title', 'Logged out, click to login');
    }
}

fafail.initTools = function() {
    fafail.vars = {};
    fafail.updateLoginStatus();
    $('img[name="tool-login"]').click(function(){
        $('img[name="tool-login"]').attr('src', 'img/wait.png').attr('title', 'Processing...');
        if (fafail.vars.loggedIn) {
            fapi.doLogout();
        } else {
            var login = prompt('Login');
            var password = prompt('Password');
            fapi.doLogin(login, password);
        }
        fafail.updateLoginStatus();
    });
    
    fafail.vars.browsing = false;
    $('img[name="tool-browse"]').click(function(){
        if(fafail.vars.browsing) {
            $('img[name="tool-browse"]').attr('src', 'img/chronometer.png').attr('title', 'Click to browse new submissions in real time');
            fafail.vars.browsing = false;
            fafail.clearShow();
        } else {
            fafail.vars.browsing = true;
            $('img[name="tool-browse"]').attr('src', 'img/wait.png').attr('title', 'Currently browsing, click to stop');
            fafail.displayRecent();
            fafail.getRecent();
        }
    }).attr('title', 'Browse new submissions in real time');
}

$(document).ready(function(){
    fafail.initTools();
});

