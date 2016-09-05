/* global createjs */

var tools = tools || {};

tools.lastProgress = {
    message: 'Working...',
    max: 100,
    value: 0
};

tools.templatesCache = {};
tools.preloadQueue= typeof createjs !== 'undefined' ? new createjs.LoadQueue(false) : null;
tools.preloadedItems= [];
tools.preloadedItemsCallBacks= {};


tools.fetchTemplate = function(templateName, data, callback) {
    if (templateName in tools.templates) {
        callback(tools.templates[templateName](data));
    } else if (templateName in tools.templatesCache) {
        callback(tools.templatesCache[templateName](data));
    } else {
        $.get('templates/' + templateName + '.hbs?t='+new Date().getTime(), function (rawTemplate) {
            var template = Handlebars.compile(rawTemplate);
            tools.templatesCache[templateName] = template;
            callback(template(data));
        }, 'html');
    }
};

Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator];
});

Handlebars.registerHelper("test", function(lvalue, operator, rvalue, options) {
    var doRender = {
        "==": lvalue == rvalue,
        "!=": lvalue != rvalue
    }[operator];

    return doRender ? options.fn(this) : '';
});

tools.showProgress = function(progressObject) {
    for (var attrname in progressObject) {
        tools.lastProgress[attrname] = progressObject[attrname];
    }
    var progressModal = $("#progress-modal").length > 0 ? $("#progress-modal")[0] : null;
    if (progressModal === null) {
        $('body').append('<div id="progress-modal"></div>');
        progressModal = $("#progress-modal")[0];
    }
    tools.fetchTemplate("progress-modal", tools.lastProgress, function(progress){
        $(progressModal).html(progress);
        $(progressModal).modal({
            escapeClose: false,
            clickClose: false,
            showClose: false
        });
    });
};

tools.message = function(message, callback, closeable) {
    if (closeable === undefined) {
        closeable = false;
    }
    $("#message-modal").remove();
    tools.fetchTemplate("message-modal", {message : message}, function(messageModal){
        $('body').append(messageModal);
        var modal = $("#message-modal").modal({
            escapeClose: closeable,
            clickClose: closeable,
            showClose: closeable
        });
        callback();
    });
};

tools.initTools = function () {
    if (tools.preloadQueue) {
        tools.preloadQueue.installPlugin(createjs.Sound);

        var preloadCallback = function (event) {
            var item = event.item;
            var type = item.type;
            console.log('preloaded item ' + item);
            tools.preloadedItems.push(item.id);
            if (item.id in tools.preloadedItemsCallBacks) {
                var callbacks = tools.preloadedItemsCallBacks[item.id];
                for (var i = 0; i < callbacks.length; i++) {
                    callbacks[i]();
                }
            }
        };

        tools.preloadQueue.on('fileload', preloadCallback, this);
        tools.preloadQueue.on('error', preloadCallback, this);
    }

    createjs.Sound.registerSound("sound/wtf_fa - allright.mp3", 'allright');
    createjs.Sound.registerSound("sound/wtf_fa - fail.mp3", 'fail');
    createjs.Sound.registerSound("sound/wtf_fa - bgmusic.mp3", 'bgmusic');
    createjs.Sound.registerSound("sound/wtf_fa - bitch.mp3", 'bitch');
    createjs.Sound.registerSound("sound/wtf_fa - epic10pts.mp3", 'epic10pts');
    createjs.Sound.registerSound("sound/wtf_fa - humiliation.mp3", 'humiliation');
    createjs.Sound.registerSound("sound/wtf_fa - letsrock.mp3", 'letsrock');
    createjs.Sound.registerSound("sound/wtf_fa - shat.mp3", 'shat');
    createjs.Sound.registerSound("sound/wtf_fa - update.mp3", 'update');

};

tools.playSound = function(soundID) {
    return createjs.Sound.play(soundID);
};

tools.preload = function(url) {
    console.log('adding file to preload : ' + url);
    tools.preloadQueue.loadFile({
		src: url,
		maintainOrder: true,
		loadTimeout: 30 * 1000
	});
};

tools.ensurePreloaded = function(url, callback) {
    if($.inArray(url, tools.preloadedItems) != -1) {
        callback();
    } else if (url.endsWith('webm')) {
        callback();
    } else {
        if (!(url in tools.preloadedItemsCallBacks)) {
            tools.preloadedItemsCallBacks[url] = [];
        }
        tools.preloadedItemsCallBacks[url].push(callback);
    }
};

tools.flash = function(selector, flashClass) {
    $(selector).addClass("flash-"+flashClass);
    setTimeout( function(){
        $(selector).removeClass("flash-"+flashClass);
    }, 1000);
};

tools.newSocket = function () {
    return io();
};

tools.pickRandom = function(fromArray, excludingElements) {
    var array = [];
    $.each(fromArray, function(x, item) {
        if ($.inArray(item, excludingElements) === -1) {
            array.push(item);
        }
    });
    return array[Math.floor(Math.random()*array.length)];
};

tools.shuffleArrayInPlace = function(a) {
    var j, x, i;
    for (i = a.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
};

tools.statusToIcon = function(statusText) {
	return {
		'ok': 'uk-icon-check',
		'warning': 'uk-icon-warning',
		'error': 'uk-icon-exclamation'
	}[statusText];
};