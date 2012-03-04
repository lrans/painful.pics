
var fapi = {};

fapi.inner = {};

fapi.inner.proxy = function(url) {
    console.log('proxy for : ' + url);
    var result = document.proxyApplet.request(url);
    return $($.parseXML(result));
}

fapi.inner.extractSubmissions = function(pageXML, callback) {
    var result = null;
    var pageHasResults = false;
    pageXML.find('ul[class="messages-stream"]').find('li').map(function(){
        var id = /id_([0-9]+)/.exec($(this).attr('id'))[1];
        if (id) {
            if (!result) {
                result = {};
            }
            pageHasResults = true;
            var imgThumbURL = $(this).find('img[alt="thumb"]').attr('src');
            var imgId = /([0-9]+)\./.exec(imgThumbURL)[1];
            var matchThumb = /(.*)\.thumbnail\.(.*)/.exec(imgThumbURL);
            result[id] = {
                id: id,
                title: $(this).find('div[class="info"]').find('span').text(),
                author: {
                    name: $(this).find('div[class="info"]').find('a').text(),
                    handle: /\/user\/(.*)\//.exec($(this).find('div[class="info"]').find('a').attr('href'))[1]
                },
                resource: {
                    id: imgId,
                    thumbnail: imgThumbURL,
                    half: matchThumb[1] + '.half.' + matchThumb[2],
                    full: matchThumb[1] + '.' + matchThumb[2]
                }
            };
        }
    });
    if (pageHasResults) {
        pageXML.find('table[class="innertable"]').find('script').map(function(){
            eval($(this).text());
            $.each(result, function(id, data){
                var desc = descriptions['id_' + id];
                if(desc) {
                    data.description = desc.description;
                }
            });
        });
    }
    if (typeof(callback) == 'function') {
        $.map(result, function(submission){
            callback(submission);
        });
    }
    return result;
}

fapi.inner.getSubmission = function(baseURL, nb, nbPerPage, callback) {
    var nbPages = Math.max(1, nb / nbPerPage);
    var result = {};
    for (var page = 1; page <= nbPages || !(nb); page++) {
        var pageXml = fapi.inner.proxy(baseURL + '/' + page);
        var pageSubmissions = fapi.inner.extractSubmissions(pageXml, callback);
        if (pageSubmissions) {
            $.map(pageSubmissions, function(props, id){
                result[id] = props;
            });
        } else {
            break;
        }
    }
    return result;
}

fapi.getFavs = function(user, nbFavs, callback) {
    var NB_FAVS_PER_PAGE = 32;
    return fapi.inner.getSubmission('/favorites/' + user, nbFavs, NB_FAVS_PER_PAGE, callback);
}

fapi.getGallery = function(user, nbSubmissions, callback) {
    var NB_SUBS_PER_PAGE = 32;
    return fapi.inner.getSubmission('/gallery/' + user, nbSubmissions, NB_SUBS_PER_PAGE, callback);
}

fapi.getRecent = function(nbRecents, callback) {
    var NB_RECENTS_PER_PAGE = 32;
    return fapi.inner.getSubmission('/browse/', nbRecents, NB_RECENTS_PER_PAGE, callback);
}

fapi.doLogin = function(login, password) {
    document.proxyApplet.request('/login/', 'POST', JSON.stringify({
        action:'login', 
        retard_protection: 1, 
        name : login, 
        pass : password, 
        login : 'Login to FurAffinity'
    }));
}

fapi.doLogout = function() {
    fapi.inner.proxy('/logout/');
}

fapi.getCurrentUser = function () {
    var pageXML = fapi.inner.proxy('/');
    var node = pageXML.find('#logout-link').parent().find('span').find('a').attr('href');
    if (node) {
        var user = /\/user\/(.*)\//.exec(node)[1];
        return user;
    } else {
        return null;
    }
}
