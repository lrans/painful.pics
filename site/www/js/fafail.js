
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
        setTimeout(fafail.displayRecent, 0.01 * 1000);
    }
}

fafail.showImage = function(submission) {
    var img = new Image();
    var fullImg = new Image();
    var div = $('<div class="submission" name="' + submission.id + '"></div>');
    var rotation = Math.floor(Math.random() * 40) - 20;
    $(div).hide();
    $(div).rotate(rotation);
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
            $(div).fadeOut('fast', function(){
                $(div).remove();
            });
        });
        deleteSubmission.appendTo(buttons);

        var zoomSubmission = $('<img src="img/zoom-draw.png" title="View full size"/>').click(function(){
            var imgButton = $(this);
            imgButton.fadeOut('fast');
            if (imgButton.attr('name') == 'full') {
                $(fullImg).animate({height: img.height, width: img.width}, 600, function(){
                    $(fullImg).hide();
                    $(img).show();
                    imgButton.attr('name','half').attr('title', 'View full size').fadeIn('fast');
                });
                $(div).rotate({animateTo:rotation, duration:600});
            } else {
                $(fullImg).load(function () {
                    $(fullImg).attr('style', '');
                    var fullDimensions = {height: fullImg.height, width: fullImg.width};
                    $(fullImg).css('height', img.height).css('width', img.width);
                    $(img).hide();
                    $(fullImg).show();
                    var targetDimensions = {
                        height: Math.min(fullDimensions.height, $('#show').height() - 30),
                        width: Math.min(fullDimensions.width, $('#show').width() - 30)
                    };
                    var ratio = Math.min(targetDimensions.height/fullDimensions.height, targetDimensions.width/fullDimensions.width);
                    targetDimensions = {
                        height: fullDimensions.height * ratio,
                        width: fullDimensions.width * ratio
                    };
                    var targetPosition = {
                        top: ((targetDimensions.height +  $(div).position().top)> $('#show').height() ? ($('#show').height() - targetDimensions.height - 20) : $(div).position().top),
                        left: ((targetDimensions.width +  $(div).position().left) > $('#show').width() ? ($('#show').width() - targetDimensions.width - 20) : $(div).position().left)
                    };
                    $(fullImg).animate({height: targetDimensions.height, width: targetDimensions.width}, 600);
                    $(div).animate({top: targetPosition.top + 'px', left: targetPosition.left + 'px'}, 600).rotate({animateTo:0, duration:600});
                    imgButton.attr('name', 'full').attr('title', 'View half size').fadeIn('fast');
                }).attr('src', fapi.getRawImage(submission.resource.half));
            }
        });
        zoomSubmission.appendTo(buttons);

        var favSubmission = $('<img src="img/emblem-favorite.png" title="Me gusta"/>').click(function(){
            $(this).attr('src', 'img/wait.png');
            if (fapi.doFav(submission.id)) {
                $(this).fadeOut('fast');
            } else {
                $(this).attr('src', 'img/emblem-favorite.png');
            }
        });
        if (fafail.vars.loggedIn) {
            // favSubmission.appendTo(buttons);
        }

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
        
    }).attr('src', fapi.getRawImage(submission.resource.small));
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

