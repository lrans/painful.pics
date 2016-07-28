What is this ?
============

The source code of what's behind [painful.pics](https://painful.pics/).

How does it work ?
==================

* `site/` the JS app with most of the stuff, uses :
	- [socket.io](http://socket.io/) for message exchange in "party mode"
	- [handlebars](http://handlebarsjs.com/) to have dynamic templates
	- [uikit](http://getuikit.com/) because I can't CSS
	- [bower](https://bower.io/) and [gulp](http://gulpjs.com/) to build stuff
	- [a JS port of HTML tidy](http://www.html-tidy.org/) to clean up some ugly markup
	- [PreloadJS](http://www.createjs.com/preloadjs) & [SoundJS](http://www.createjs.com/soundjs)

* `server/` a tiny nodeJS message dispatcher, based on [socket.io](http://socket.io/), used in 'party mode'
* `proxy-chrome/` a [chrome/chromium extension](https://chrome.google.com/webstore/detail/painfulpics-proxy/hnekkmgjnoakndihjenhecbhhobbheho) used to spoof what needs to be spoofed to enable CORS AJAX

That browser extension looks weird...
=====================================

More in details, this extension :
1. reads your FA cookies, keeps them in browser memory, tracks their changes (when you login/login for ex.)
2. injects those cookies on-flight in any AJAX request done by the JS app _to the FA domains_
3. also removes the _origin_ & _referer_ headers of the AJAX requests
4. injects an _Access-Control-Allow-Origin_ header in the AJAX responses, thus making the browser accept those as valid [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) responses

In the end, the painful.pics server never receives any cookie or identity information, the exchanges are only between your browser and FA.

How do I run it ?
=================

Locally
-------

1. Fetch all development dependencies
```
$> ./fetch-dependencies.sh
```

2. Run the message dispatcher server onn localhost:3000
```
$> cd server
$> ./index.js
```

3. Build the site app that will connect to localhost:3000 
```
$> cd site
$> gulp --env=local
```

4. Serve the app static content on localhost:8000
```
$> cd site
$> gulp webserver
```

5. Point your browser to http://localhost:8000/

On a server
-----------
Have a look at `Jenkinsfile`

