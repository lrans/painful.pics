package com.proxy.proxyapplet;

import com.sun.org.apache.xml.internal.serialize.OutputFormat;
import com.sun.org.apache.xml.internal.serialize.XMLSerializer;
import java.applet.Applet;
import java.io.StringWriter;
import java.io.Writer;
import java.net.URI;
import java.security.AccessController;
import java.security.InvalidParameterException;
import java.security.PrivilegedAction;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import net.sf.json.JSONObject;
import netscape.javascript.JSObject;
import org.apache.http.*;
import org.apache.http.client.CookieStore;
import org.apache.http.client.RedirectStrategy;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.client.params.ClientPNames;
import org.apache.http.client.params.CookiePolicy;
import org.apache.http.client.utils.URIUtils;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.cookie.Cookie;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.impl.client.DefaultRedirectStrategy;
import org.apache.http.impl.cookie.BasicClientCookie;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.protocol.HttpContext;
import org.w3c.dom.Document;
import org.w3c.tidy.Tidy;

public class Proxy extends Applet {

    private static final String RQ_BASE_URL = "www.furaffinity.net";
    private final CookieStore cookieStore = new CookieStore() {

        public void addCookie(Cookie cookie) {
            JSObject win = (JSObject) JSObject.getWindow(Proxy.this);
            win.eval("document.cookie = '" + cookie.getName().trim() + "=" + cookie.getValue().trim() + "';");
        }

        public List<Cookie> getCookies() {
            JSObject win = (JSObject) JSObject.getWindow(Proxy.this);
            Object cookies = win.eval("document.cookie;");
            List<Cookie> result = new ArrayList<Cookie>();
            for (String cookieString : cookies.toString().split(";")) {
                String[] nameAndValue = cookieString.split("=");

                if (nameAndValue.length >= 2) {
                    BasicClientCookie cookie = new BasicClientCookie(nameAndValue[0].trim(), nameAndValue[1].trim());
                    cookie.setDomain("www.furaffinity.net");
                    result.add(cookie);
                }
            }
            return result;
        }

        public boolean clearExpired(Date date) {
            return true;
        }

        public void clear() {
            // nope
        }
    };

    @Override
    public void init() {
        super.init();
    }

    public String request(final String url) {
        return request(url, "GET", "{}");
    }

    public String request(final String url, final String method) {
        return request(url, method, "{}");
    }

    public String request(final String url, final String method, final String paramsAsJSON) {
        try {
            return AccessController.doPrivileged(new PrivilegedAction<String>() {

                public String run() {
                    try {
                        DefaultHttpClient httpclient = new DefaultHttpClient();
                        httpclient.getParams().setParameter(ClientPNames.COOKIE_POLICY, CookiePolicy.BROWSER_COMPATIBILITY);
                        httpclient.setCookieStore(cookieStore);
                        /*
                         * httpclient.setRedirectStrategy(new
                         * DefaultRedirectStrategy() {
                         *
                         * @Override public boolean isRedirected( final
                         * HttpRequest request, final HttpResponse response,
                         * final HttpContext context) throws ProtocolException {
                         * if (response == null) { throw new
                         * IllegalArgumentException("HTTP response may not be
                         * null"); }
                         *
                         * int statusCode =
                         * response.getStatusLine().getStatusCode(); String
                         * method = request.getRequestLine().getMethod(); Header
                         * locationHeader = response.getFirstHeader("location");
                         * switch (statusCode) { case
                         * HttpStatus.SC_MOVED_TEMPORARILY: return
                         * (method.equalsIgnoreCase(HttpGet.METHOD_NAME) ||
                         * method.equalsIgnoreCase(HttpPost.METHOD_NAME) ||
                         * method.equalsIgnoreCase(HttpHead.METHOD_NAME)) &&
                         * locationHeader != null; case
                         * HttpStatus.SC_MOVED_PERMANENTLY: case
                         * HttpStatus.SC_TEMPORARY_REDIRECT: return
                         * method.equalsIgnoreCase(HttpGet.METHOD_NAME) ||
                         * method.equalsIgnoreCase(HttpPost.METHOD_NAME) ||
                         * method.equalsIgnoreCase(HttpHead.METHOD_NAME); case
                         * HttpStatus.SC_SEE_OTHER: return true; default: return
                         * false; } //end of switch }
                        });
                         */


                        List<NameValuePair> qparams = new ArrayList<NameValuePair>();
                        JSONObject params = JSONObject.fromString(paramsAsJSON);
                        Iterator<Object> keysIt = params.keys();
                        while (keysIt.hasNext()) {
                            String key = keysIt.next().toString();
                            String value = params.get(key).toString();
                            qparams.add(new BasicNameValuePair(key, value));
                        }

                        HttpRequestBase request = null;
                        if ("get".equalsIgnoreCase(method)) {
                            URI uri = URIUtils.createURI("http", RQ_BASE_URL, -1, url, URLEncodedUtils.format(qparams, "UTF-8"), null);
                            request = new HttpGet(uri);
                        } else if ("post".equalsIgnoreCase(method)) {
                            URI uri = URIUtils.createURI("https", RQ_BASE_URL, -1, url, null, null);
                            HttpPost post = new HttpPost(uri);
                            UrlEncodedFormEntity entity = new UrlEncodedFormEntity(qparams, "UTF-8");
                            post.setEntity(entity);
                            // post.addHeader("Referer", "https://www.furaffinity.net/login/");
                            request = post;
                        } else {
                            throw new InvalidParameterException("method " + method + "unknown");
                        }

                        HttpResponse response = httpclient.execute(request);
                        HttpEntity entity = response.getEntity();
                        if (entity != null) {
                            System.err.println();
                            Tidy tidy = new Tidy();
                            tidy.setMakeClean(true);
                            tidy.setWrapScriptlets(true);
                            tidy.setXmlOut(true);
                            tidy.setQuiet(true);
                            Document doc = tidy.parseDOM(entity.getContent(), null);

                            OutputFormat format = new OutputFormat(doc);

                            Writer out = new StringWriter();
                            XMLSerializer serializer = new XMLSerializer(out, format);
                            serializer.serialize(doc);

                            return out.toString();
                        } else {
                            return "Nope! entity null";
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        return "Nope!" + e.getMessage();
                    }
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
            return "Nope!" + e.getMessage();
        }
    }

    public static void main(String[] args) {
    }
}
