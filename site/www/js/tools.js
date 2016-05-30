var tools = {
    lastProgress: {
        message: 'Working...',
        max: 100,
        value: 0
    },
    templatesCache: {}
};

tools.fetchTemplate = function(templateName, data, callback) {
    if (templateName in tools.templatesCache) {
        callback(tools.templatesCache[templateName](data));
    } else {
        $.get('templates/' + templateName + '.hbs', function (rawTemplate) {
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

tools.showProgress = function(progressObject) {
    for (var attrname in progressObject) {
        tools.lastProgress[attrname] = progressObject[attrname];
    }
    var progressModal = $("#progress-modal").length > 0 ? $("#progress-modal")[0] : null;
    if (progressModal == null) {
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
    if (closeable == undefined) {
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
