
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
        setTimeout(fafail.getRecent, 30 * 1000);
    }
}

fafail.displayRecent = function() {
    if (fafail.submissionsQueue.length > 0) {
        var submission = fafail.submissionsQueue.shift();
        fafail.showImage(submission);
    }
    if (fafail.vars.browsing) {
        setTimeout(fafail.displayRecent, 1 * 1000);
    }
}

fafail.showImage = function(submission) {
    var img = new Image();
    var fullImg = new Image();
    var div = $('<div class="submission" name="' + submission.id + '"></div>');
    $(div).hide();
    $(fullImg).hide().attr('class', 'handle').appendTo(div);
    $(img).attr('class', 'handle').appendTo(div);
    $(img).load(function () {
        var top = Math.floor(Math.random()*($('#show').height() - img.height - 10));
        var left = Math.floor(Math.random()*($('#show').width() - img.width - 10));
        $(div).css('top', top).css('left', left).css('z-index', 990);
        
        var buttons = $('<div class="submission-buttons"></div>');
        
        var gotoSubmissionPage = $('<a href="http://www.furaffinity.net/view/' + submission.id + '/" target="_new" title="Go to submission page"><img src="img/internet-web-browser.png"/></a>');
        gotoSubmissionPage.appendTo(buttons);
        
        var deleteSubmission = $('<img src="img/edit-delete.png" title="D&eacute;gage, saloperie !"/>').click(function(){
            $(div).hide();
        });
        deleteSubmission.appendTo(buttons);

        var zoomSubmission = $('<img src="img/zoom-draw.png" title="View full size"/>').click(function(){
            var imgButton = $(this);
            imgButton.fadeOut('fast');
            if (imgButton.attr('name') == 'full') {
                $(fullImg).fadeOut();
                $(img).fadeIn();
                imgButton.attr('name','half').attr('title', 'View full size').fadeIn('fast');
            } else {
                $(fullImg).load(function () {
                    var fullDimensions = {height: fullImg.height, width: fullImg.width};
                    $(fullImg).css('height', img.height).css('width', img.width);
                    $(img).hide();
                    $(fullImg).show();
                    var targetDimensions = {
                        height: Math.max(fullDimensions.height, $('#show').height() - 10),
                        width: Math.max(fullDimensions.width, $('#show').width() - 10)
                    };
                    var targetPosition = {
                        top: (targetDimensions.height +  $(div).css('top') > $('#show').height() ? $('#show').height() - targetDimensions.height : $(div).css('top')),
                        left: (targetDimensions.width +  $(div).css('left') > $('#show').width() ? $('#show').width() - targetDimensions.width : $(div).css('left'))
                    };
                    $(fullImg).animate({height: targetDimensions.height, width: targetDimensions.width}, 600);
                    $(div).animate({top: targetPosition.top, left: targetPosition.left}, 600);
                    imgButton.attr('name', 'full').attr('title', 'View half size').fadeIn('fast');
                }).attr('src', submission.resource.full);
            }
        });
        zoomSubmission.appendTo(buttons);

        var favSubmission = $('<img src="img/emblem-favorite.png" title="Me gusta"/>').click(function(){
            $(this).attr('src', 'img/wait.png');
            if (fapi.doFav(submission.id)) {
                // whatever
                $(this).fadeOut('fast');
            } else {
                $(this).attr('src', 'img/emblem-favorite.png');
            }
        });
        favSubmission.appendTo(buttons);

        buttons.hide();
        buttons.appendTo(div);
        $(div).mouseenter(function(){
            buttons.fadeIn('fast');
        }).mouseleave(function(){
            buttons.fadeOut('fast');
        });

        $(div).appendTo('#show').animaDrag({
            interval: 100,
            speed: 400,
            boundary: $('#show'),
            overlay: false,
            after: function() {
                $(div).appendTo('#show');
            },
            grip:'img.handle'
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
        } else {
            fafail.vars.browsing = true;
            $('img[name="tool-browse"]').attr('src', 'img/wait.png').attr('title', 'Currently browsing, click to stop');
            fafail.displayRecent();
            fafail.getRecent();
        }
    }).attr('title', 'Browse new submissions in real time');
    
    $('img[name="tool-clear"]').click(function(){
        fafail.clearShow();
    });
}

$(document).ready(function(){
    fafail.initTools();
});

