
var fapi = {
    conf: {
        domain: {
            base: 'www.furaffinity.net',
            thumbnails: 't.facdn.net'
        }
    }
};

fapi.inner = {};

fapi.inner.proxycallBacks = {};

var proxyCallBack = function(key, rawResult) {
    fapi.inner.proxycallBacks[key](rawResult);
    fapi.inner.proxycallBacks[key] = null;
}

fapi.inner.proxy = function(path, callback, domain, params, method, binaryResult) {
    if(!domain) {
        domain = fapi.conf.domain.base;
    }
    if(!method) {
        method = 'GET';
    }
    if(!params) {
        params = {};
    }
    if(!binaryResult) {
        binaryResult = false;
    } else {
        binaryResult = true;
    }
    console.log('proxy for : ' + domain + path);

    var chars = "abcdefghiklmnopqrstuvwxyz";
    var string_length = 64;
    var key = '';
    for (var i=0; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            key += chars.substring(rnum,rnum+1);
    }

    fapi.inner.proxycallBacks[key] = function(rawResult) {
        if (typeof(callback) == 'function') {
            if (binaryResult) {
                callback(rawResult);
            } else {
                callback($($.parseXML(rawResult)));
            }
        }
    };

    if (document.proxyApplet === undefined) {
        $('applet').remove();
        $('body').append('<applet name="proxyApplet" code="com.proxy.proxyapplet.Proxy" codebase="." archive="proxy.jar" width="1" heigth="1"></applet>')
    }
    document.proxyApplet.request(domain, path, method,JSON.stringify(params), binaryResult, key)
}

fapi.inner.extractSubmissions = function(pageXML, callback) {
    var result = null;
    var pageHasResults = false;
    pageXML.find('.flow').find('b').map(function(){
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
                    tiny: thumbServer + '/' + subId + '@100-' + imgId,
                    small: thumbServer + '/' + subId + '@300-' + imgId,
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
    $.map(result, function(submission){
        callback(submission);
    });
}

fapi.inner.getSubmission = function(baseURL, nb, nbPerPage, callback) {
    var nbPages = Math.max(1, nb / nbPerPage);
    fapi.inner.getSubmissions(baseURL, nbPages, callback, 1);
}


fapi.inner.getSubmissions = function(baseURL, nbPages, callback, page) {
    var pageXml = fapi.inner.proxy(baseURL + '/' + page);
    fapi.inner.proxy(baseURL + '/' + page, function(pageXML){
        fapi.inner.extractSubmissions(pageXML, callback);
        if(page < nbPages) {
            fapi.inner.getSubmissions(baseURL, nbPages, callback, page + 1);
        }
    });
}

fapi.getFavs = function(user, nbFavs, callback) {
    var NB_FAVS_PER_PAGE = 32;
    fapi.inner.getSubmission('/favorites/' + user, nbFavs, NB_FAVS_PER_PAGE, callback);
}

fapi.getGallery = function(user, nbSubmissions, callback) {
    var NB_SUBS_PER_PAGE = 32;
    fapi.inner.getSubmission('/gallery/' + user, nbSubmissions, NB_SUBS_PER_PAGE, callback);
}

fapi.getRecent = function(nbRecents, callback) {
    var NB_RECENTS_PER_PAGE = 32;
    fapi.inner.getSubmission('/browse/', nbRecents, NB_RECENTS_PER_PAGE, callback);
};

fapi.doLogin = function(callback) {
    fapi.inner.proxy('captcha.jpg', function(captcha){
        $.get('templates/fa-login.hbs', function (rawTemplate) {
            var template = Handlebars.compile(rawTemplate);
            $('body').append(template({
                'captcha': captcha
            }));
            var loginModal = $('#login-modal');
            loginModal.find('button.login').click(function(){
                fapi.inner.proxy('/login/', function(){
                    $.modal.close();
                    callback();
                }, 'www.furaffinity.net', {
                    action: 'login',
                    captcha: loginModal.find('input[name=captcha]').val(),
                    login : 'Login to FurAffinity',
                    name : loginModal.find('input[name=login]').val(),
                    pass : loginModal.find('input[name=password]').val()
                }, 'POST', true);
                return false;
            });
            loginModal.modal();
        }, 'html');
    }, "www.furaffinity.net", {}, "GET", true);
}

fapi.doLogout = function(callback) {
    fapi.inner.proxy('/logout/', callback);
}

fapi.getCurrentUser = function(callback) {
    fapi.inner.proxy('/', function(pageXML){
        var node = pageXML.find('#my-username.hideonmobile').attr('href');
        if (node) {
            var user = /.*\/user\/(.*)\//.exec(node)[1];
            callback(user);
        } else {
            callback(null);
        }
    });
}

fapi.doFav = function(submissionId) {
    // TODO : gérer les cookies / image
    var pageXML = fapi.inner.proxy('/view/' + submissionId);
    var favLink = pageXML.find('div.actions').find('b').find('a').filter(function(){return $(this).attr('href').indexOf('/fav') == 0;}).attr('href');
    var favedPage = fapi.inner.proxy(favLink);
    return favedPage.find('div.actions').find('b').find('a').filter(function(){return $(this).attr('href').indexOf('/fav') == 0;}).text().indexOf('-') == 0;
}

fapi.getRawImage = function(url, callback) {
    var extractDomain = /.*\/\/([^\/]+)(\/.*)/.exec(url);
    var domain = extractDomain[1];
    var path = extractDomain[2];
    console.log('img proxy for : ' + domain + path)
    fapi.inner.proxy(path, function(data){
        callback('data:image/jpg;base64,' + data);
    }, domain, {}, 'GET', true);
}

fapi.getExtendedInfo = function(submissionID, callback) {
    fapi.inner.proxy('/full/' + submissionID, function(pageXML){
        var result = {
            fullImg: pageXML.find('#submissionImg').attr('src')
        };

        var infoTD = pageXML.find('b').filter(function(){return $(this).text() == 'Submission information:';}).parent();
        var contents = infoTD.contents();
        $.map(contents, function(elem, index){
            if($(elem).text() == 'Category:') {
                result['category'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
            if($(elem).text() == 'Theme:') {
                result['theme'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
            if($(elem).text() == 'Species:') {
                result['species'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
            if($(elem).text() == 'Gender:') {
                result['gender'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
            if($(elem).text() == 'Favorites:') {
                result['favorites'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
            if($(elem).text() == 'Comments:') {
                result['comments'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
            if($(elem).text() == 'Views:') {
                result['views'] = $(contents[index + 1]).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
        });
        
        var keywords = pageXML.find('#keywords').find('a').map(function(){
            return $(this).text();
        });
        result['keywords'] = keywords;

        callback(result);
    });
}
