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
    setTimeout(fafail.getRecent, 10 * 1000);
}

fafail.displayRecent = function() {
    if (fafail.submissionsQueue.length > 0) {
        var submission = fafail.submissionsQueue.shift();
        fafail.showImage(submission);
    }
    setTimeout(fafail.displayRecent, 2 * 1000);
}

fafail.showImage = function(submission) {
    var img = new Image();
    var div = $('<div class="submission" name="' + submission.id + '"></div>');
    $(div).hide();
    $(img).appendTo(div);
    $(img).load(function () {
      var top = Math.floor(Math.random()*($('#show').height() - img.height + 1));
      var left = Math.floor(Math.random()*($('#show').width() - img.width + 1));
      $(div).css('top', top).css('left', left);
      $(div).appendTo('#show').animaDrag({
          interval: 100,
          speed: 400,
          boundary: $('#show')
      }).fadeIn();
    }).attr('src', submission.resource.half);
}

$(document).ready(function(){
    fafail.displayRecent();
    fafail.getRecent();
});

