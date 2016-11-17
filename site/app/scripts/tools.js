/* global createjs, ds, UIkit */

var tools = tools || {};

tools.lastProgress = {
    message: 'Working...',
    max: 100,
    value: 0
};

tools.templatesCache = {};
tools.preloadQueue= typeof createjs !== 'undefined' ? new createjs.LoadQueue(false) : null;
tools.preloadedItems= {};
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
	tools.lastProgress.percents = (tools.lastProgress.value / tools.lastProgress.max) * 100;
    var progressModalElem = $("#progress-modal").length > 0 ? $("#progress-modal")[0] : null;
	var shown = true;
    if (progressModalElem === null) {
		shown = false;
        $('body').append('<div id="progress-modal" class="uk-modal"></div>');
        progressModalElem = $("#progress-modal")[0];
    }

	if (shown) {
		$('#progress-modal div.uk-progress-bar').css('width', tools.lastProgress.percents + '%');
	} else {
		tools.fetchTemplate("progress-modal", tools.lastProgress, function(progress){
			$(progressModalElem).html(progress);
			var progressModal = UIkit.modal("#progress-modal", {center: true, bgclose: false, keyboard: false});
			progressModal.show();
		});
	}
};

tools.hideProgress = function() {
	UIkit.modal("#progress-modal").hide();
	$("#progress-modal").remove();
};

tools.message = function(message, callback, closeable) {
    if (closeable === undefined) {
        closeable = false;
    }
    $("#message-modal").remove();
    tools.fetchTemplate("message-modal", {message : message}, function(modalTemplate){
        $('body').append(modalTemplate);
		var messageModal = UIkit.modal("#message-modal", {center: true, bgclose: closeable, keyboard: closeable});
		messageModal.show();
        callback(messageModal);
    });
};

tools.initTools = function () {
    if (tools.preloadQueue) {
        tools.preloadQueue.installPlugin(createjs.Sound);

        var preloadCallback = function (event) {
            var item = event.item;
            var type = item.type;
            console.log('preloaded item ' + item.id);
			
			var newImg = new Image();

			newImg.onload = function() {
				var height = newImg.height;
				var width = newImg.width;
				tools.preloadedItems[item.id] = {
					height: height,
					width: width
				};
				if (item.id in tools.preloadedItemsCallBacks) {
					var callbacks = tools.preloadedItemsCallBacks[item.id];
					for (var i = 0; i < callbacks.length; i++) {
						callbacks[i](tools.preloadedItems[item.id]);
					}
				}
			};
			newImg.src = item.id;
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
    if($.inArray(url, Object.keys(tools.preloadedItems)) !== -1) {
        callback(tools.preloadedItems[url]);
    } else if (url.endsWith('webm')) {
        callback({});
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

tools.getAvailableDatasource = function() {
	var result = [];
	$.each(ds, function(name, datasource) {
        if (datasource.checkAvailability().status === 'ok') {
			result.push(name);
		}
    });
	return result;
};
