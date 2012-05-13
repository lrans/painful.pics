
var fapi = {
    conf: {
        domain: {
            base: 'www.furaffinity.net',
            thumbnails: 't.facdn.net'
        }
    }
};

fapi.inner = {};

fapi.inner.proxy = function(url, domain) {
    if(!domain) {
        domain = fapi.conf.domain.base;
    }
    console.log('proxy for : ' + domain + url);
    var result = document.proxyApplet.request(domain, url);
    return $($.parseXML(result));
}

fapi.inner.extractSubmissions = function(pageXML, callback) {
    var result = null;
    var pageHasResults = false;
    pageXML.find('.flow.browse').find('b').map(function(){
        var id = /sid_([0-9]+)/.exec($(this).attr('id'))[1];
        if (id) {
            if (!result) {
                result = {};
            }
            pageHasResults = true;
            var imgThumbURL = $(this).find('img').attr('src');
            var matchThumb = /(.*)\/([0-9]+)@([0-9]+)-(.*)#(.*)/.exec(imgThumbURL);
            var thumbServer = matchThumb[1];
            var subId = matchThumb[2];
            var thumbResolution = matchThumb[3];
            var imgId = matchThumb[4];
            var authorHandle = matchThumb[5];
            result[id] = {
                id: id,
                title: $(this).find('span').text(),
                author: {
                    name: $(this).find('small').find('a').text(),
                    handle: /\/user\/(.*)\//.exec($(this).find('small').find('a').attr('href'))[1]
                },
                resource: {
                    id: imgId,
                    thumbnail: imgThumbURL,
                    small: thumbServer + '/' + subId + '@200-' + imgId,
                    half: thumbServer + '/' + subId + '@400-' + imgId
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

fapi.doFav = function(submissionId) {
    // TODO : gérer les cookies / image
    var pageXML = fapi.inner.proxy('/view/' + submissionId);
    var favLink = pageXML.find('div.actions').find('b').find('a').filter(function(){return $(this).attr('href').indexOf('/fav') == 0;}).attr('href');
    var favedPage = fapi.inner.proxy(favLink);
    return favedPage.find('div.actions').find('b').find('a').filter(function(){return $(this).attr('href').indexOf('/fav') == 0;}).text().indexOf('-') == 0;
}

fapi.getRawImage = function(url, callback) {
    console.log('img proxy for : ' + url);
    var extractDomain = /.*\/\/([^\/]+)(\/.*)/.exec(url);
    var domain = extractDomain[1];
    var path = extractDomain[2];
    console.log('img proxy for : ' + domain + path)
    var result = 'data:image/jpg;base64,' + document.proxyApplet.requestImage(domain, path);
    if (typeof(callback) == 'function') {
        callback(result);
    }
    return result;
}
