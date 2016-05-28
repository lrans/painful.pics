var tools = {};

tools.fetchTemplate = function(templateName, data, callback) {
    $.get('templates/'+templateName+'.hbs', function (rawTemplate) {
        var template = Handlebars.compile(rawTemplate);
        callback(template(data));
    }, 'html');
};
