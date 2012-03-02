
var fapi = {};

fapi.inner = {};

fapi.inner.proxy = function(url) {
    var result = document.proxyApplet.request(url);
    return $($.parseXML(result));
}

fapi.inner.extractSubmissions = function(pageXML, callback) {
    var result = null;
    var pageHasResults = false;
    pageXML.find('ul[class="messages-stream"]').find('li').map(function(){
        var id = $(this).attr('id').substr(3);
        if (id) {
            if (!result) {
                result = {};
            }
            pageHasResults = true;
            result[id] = {
                id: id,
                thumbnail: $(this).find('img[alt="thumb"]').attr('src'),
                title: $(this).find('div[class="info"]').find('span').text(),
                author: {
                    name: $(this).find('div[class="info"]').find('a').text(),
                    handle: $(this).find('div[class="info"]').find('a').attr('href').substr(6)
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
        $.map(result, function(id, submission) {
            callback(submission);
        });
    }
    return result;
}

fapi.inner.getSubmission(baseURL, nb, nbPerPage, callback) {
    var nbPages = Math.max(1, nb / nbPerPage);
    var result = {};
    for (var page = 1; page <= nbPages || !(nb); page++) {
        var pageXml = fapi.inner.proxy(baseURL + '/' + page);
        var pageSubmissions = fapi.inner.extractSubmissions(pageXml, callback);
        if (pageSubmissions) {
            $(pageSubmissions).map(function(id, props){
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
    return 
}

fapi.getRecent = function(user, nbRecents, callback) {
    var NB_RECENTS_PER_PAGE = 32;
    var nbPages = Math.max(1, nbFavs / NB_FAVS_PER_PAGE);
    var result = {};
    for (var page = 1; page <= nbPages || !(nbFavs); page++) {
        var pageXml = fapi.inner.proxy('/favorites/' + user + '/' + page);
        var pageSubmissions = fapi.inner.extractSubmissions(pageXml, callback);
        if (pageSubmissions) {
            $(pageSubmissions).map(function(id, props){
                result[id] = props;
            });
        } else {
            break;
        }
    }
    return result;
}

