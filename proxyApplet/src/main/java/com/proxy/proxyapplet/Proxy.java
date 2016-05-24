package com.proxy.proxyapplet;

import com.sun.org.apache.xml.internal.serialize.OutputFormat;
import com.sun.org.apache.xml.internal.serialize.XMLSerializer;
import java.applet.Applet;
import java.applet.AppletContext;
import java.io.ByteArrayOutputStream;
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
import java.util.logging.Level;
import java.util.logging.Logger;
import net.sf.json.JSONObject;
import netscape.javascript.JSException;
import netscape.javascript.JSObject;
import org.apache.http.*;
import org.apache.http.client.CookieStore;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.client.params.ClientPNames;
import org.apache.http.client.params.CookiePolicy;
import org.apache.http.client.utils.URIUtils;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.cookie.Cookie;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.impl.cookie.BasicClientCookie;
import org.apache.http.message.BasicNameValuePair;
import org.apache.xerces.impl.dv.util.Base64;
import org.w3c.dom.Document;
import org.w3c.tidy.Tidy;
import org.apache.commons.io.IOUtils;
import sun.plugin.javascript.JSContext;

public class Proxy extends Applet {

    private static final String DOMAINS[] = {
        "www.furaffinity.net",
        "t.facdn.net"
    };


    public static JSObject getWindow(Applet applet) {
        if (applet != null) {
            AppletContext context = applet.getAppletContext();

            if (context instanceof JSContext) {
                JSContext jsContext = (JSContext)context;
                JSObject jsObject = jsContext.getJSObject();

                if (jsObject != null) {
                    return jsObject;
                }
            }
        }

        throw new JSException();
    }


    private final CookieStore cookieStore = new CookieStore() {

        public void addCookie(Cookie cookie) {
            JSObject win = (JSObject) getWindow(Proxy.this);
            win.eval("document.cookie = '" + cookie.getName().trim() + "=" + cookie.getValue().trim() + "';");
        }

        public List<Cookie> getCookies() {
            JSObject win = (JSObject) getWindow(Proxy.this);
            Object cookies = win.eval("document.cookie;");
            List<Cookie> result = new ArrayList<Cookie>();
            for (String cookieString : cookies.toString().split(";")) {
                String[] nameAndValue = cookieString.split("=");

                if (nameAndValue.length >= 2) {
                    for (String domain : DOMAINS) {
                        BasicClientCookie cookie = new BasicClientCookie(nameAndValue[0].trim(), nameAndValue[1].trim());
                        cookie.setDomain(domain);
                        result.add(cookie);
                    }
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

    public void request(final String domain, final String url, final String callback) {
        request(domain, url, "GET", "{}", false, callback);
    }

    public void requestImage(final String domain, final String url, final String callback) {
        request(domain, url, "GET", "{}", true, callback);
    }

    public void request(final String domain, final String url, final String method, final String callback) {
        request(domain, url, method, "{}", false, callback);
    }

    public void request(final String domain, final String url, final String method, final String paramsAsJSON, final boolean binaryResult, final String callback) {
        try {
            AccessController.doPrivileged(new PrivilegedAction<String>() {

                public String run() {
                    new Thread(new Runnable() {

                        public void run() {
                            String result = "";
                            try {

                                DefaultHttpClient httpclient = new DefaultHttpClient();
                                httpclient.getParams().setParameter(ClientPNames.COOKIE_POLICY, CookiePolicy.BROWSER_COMPATIBILITY);
                                httpclient.setCookieStore(cookieStore);

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
                                    URI uri = URIUtils.createURI("http", domain, -1, url, URLEncodedUtils.format(qparams, "UTF-8"), null);
                                    request = new HttpGet(uri);
                                } else if ("post".equalsIgnoreCase(method)) {
                                    URI uri = URIUtils.createURI("https", domain, -1, url, null, null);
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

                                    if (binaryResult) {
                                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                                        IOUtils.copy(response.getEntity().getContent(), out);
                                        result = Base64.encode(out.toByteArray());
                                    } else {
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

                                        result = out.toString();
                                    }
                                } else {
                                    result = "Nope! entity null";
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                                result = "Nope!" + e.getMessage();
                            }

                            final JSObject win = (JSObject) getWindow(Proxy.this);
                            
                            win.call("proxyCallBack", new String[]{callback, result});
                        }
                    }).start();




                    return null;
                }
            });


        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
    }
}
