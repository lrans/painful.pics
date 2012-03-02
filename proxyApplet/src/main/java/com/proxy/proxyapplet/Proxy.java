package com.proxy.proxyapplet;

import com.sun.org.apache.xml.internal.serialize.OutputFormat;
import com.sun.org.apache.xml.internal.serialize.XMLSerializer;
import java.applet.Applet;
import java.io.ByteArrayOutputStream;
import java.io.StringWriter;
import java.io.Writer;
import java.security.AccessController;
import java.security.PrivilegedAction;
import netscape.javascript.JSObject;
import org.apache.commons.lang.StringEscapeUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.w3c.dom.CDATASection;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.tidy.Tidy;

/**
 * Hello world!
 *
 */
public class Proxy extends Applet {

    private static final String RQ_BASE_URL = "http://www.furaffinity.net/";

    @Override
    public void init() {
        super.init();
        JSObject win = (JSObject) JSObject.getWindow(this);
        win.eval("alert('" + StringEscapeUtils.escapeJavaScript(request("")) + "');");
    }

    public static String request(final String url) {
        try {
            return AccessController.doPrivileged(new PrivilegedAction<String>() {

                public String run() {
                    try {
                        HttpClient httpclient = new DefaultHttpClient();
                        HttpGet httpget = new HttpGet(RQ_BASE_URL + url);
                        HttpResponse response = httpclient.execute(httpget);
                        HttpEntity entity = response.getEntity();
                        if (entity != null) {
                            Tidy tidy = new Tidy();
                            tidy.setMakeClean(true);
                            tidy.setWrapScriptlets(true);
                            tidy.setXmlOut(true);
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
                        return "Nope!" + e.getMessage();
                    }
                }
            });

        } catch (Exception e) {
            return "Nope!" + e.getMessage();
        }
    }

    public static void main(String[] args) {
        System.out.println(request(""));
    }
}
