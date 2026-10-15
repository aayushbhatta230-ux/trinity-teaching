package np.edu.trinity.teaching;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

import org.json.JSONObject;

/**
 * Board integration for the web app.
 *
 *   Board.setImmersive({ on })            full screen presentation (true) or board tools available (false)
 *
 * Presenting PowerPoint chapters in the board's own presentation app (WPS Office, PowerPoint …),
 * from the ORIGINAL uploaded file, unchanged:
 *   Board.fileInfo({ name })              → { exists, size }  (a copy already made earlier)
 *   Board.fileStart({ name })             start a fresh copy in the app's private cache
 *   Board.fileAppend({ name, data })      add the next base64 chunk of the file's bytes
 *   Board.fileOpen({ name, mime })        open the copy in the presentation app → { app }
 *
 * Updating the app itself in one tap (the installed web bundle updates separately):
 *   Board.installApp()                    → { state: current | permission | installing, version }
 *     reads update.json from the update channel, downloads the APK it names (only from the
 *     college download page), checks its SHA-256 and opens Android's installer.
 */
@CapacitorPlugin(name = "Board")
public class BoardPlugin extends Plugin {

    @PluginMethod
    public void setImmersive(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        main().setBoardImmersive(on);
        JSObject ret = new JSObject();
        ret.put("immersive", on);
        call.resolve(ret);
    }

    /** cache/present/<name>; only plain file names are accepted. */
    private File presentFile(PluginCall call) {
        String name = call.getString("name", "");
        if (name == null || !name.matches("[A-Za-z0-9._-]{1,120}") || name.startsWith(".")) {
            call.reject("Bad file name", "BAD_NAME");
            return null;
        }
        File dir = new File(getContext().getCacheDir(), "present");
        if (!dir.exists() && !dir.mkdirs()) {
            call.reject("No storage", "NO_STORAGE");
            return null;
        }
        return new File(dir, name);
    }

    @PluginMethod
    public void fileInfo(PluginCall call) {
        File f = presentFile(call);
        if (f == null) return;
        JSObject ret = new JSObject();
        ret.put("exists", f.exists());
        ret.put("size", f.exists() ? f.length() : 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void fileStart(PluginCall call) {
        File f = presentFile(call);
        if (f == null) return;
        // Keep the cache small: only the presentation being shown is kept.
        File[] old = f.getParentFile().listFiles();
        if (old != null) for (File o : old) if (!o.equals(f)) o.delete();
        try (FileOutputStream out = new FileOutputStream(f, false)) {
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not save the file", "WRITE_FAILED", e);
        }
    }

    @PluginMethod
    public void fileAppend(PluginCall call) {
        File f = presentFile(call);
        if (f == null) return;
        String data = call.getString("data", "");
        try (FileOutputStream out = new FileOutputStream(f, true)) {
            out.write(Base64.decode(data, Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not save the file", "WRITE_FAILED", e);
        }
    }

    @PluginMethod
    public void fileOpen(PluginCall call) {
        File f = presentFile(call);
        if (f == null) return;
        if (!f.exists()) {
            call.reject("File missing", "MISSING");
            return;
        }
        String mime = call.getString("mime", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, mime);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        PackageManager pm = getContext().getPackageManager();
        ResolveInfo app = pm.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
        String appName = null;
        if (app != null && app.activityInfo != null && !"android".equals(app.activityInfo.packageName)) {
            appName = String.valueOf(app.loadLabel(pm));
        }
        try {
            main().setBoardImmersive(false);
            main().startActivity(intent);
            JSObject ret = new JSObject();
            if (appName != null) ret.put("app", appName);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("No app can open this file", "NO_APP");
        } catch (Exception e) {
            call.reject("Could not open the file", "OPEN_FAILED", e);
        }
    }

    private static final String UPDATE_BASE = "https://github.com/aayushbhatta230-ux/trinity-teaching-app/releases/download/live/";
    private static final String INSTALLER_BASE = "https://github.com/aayushbhatta230-ux/trinity-teaching-app/releases/download/";

    @PluginMethod
    public void installApp(PluginCall call) {
        new Thread(() -> {
            try {
                JSONObject m = new JSONObject(new String(download(UPDATE_BASE + "update.json?t=" + System.currentTimeMillis(), null), "UTF-8"));
                JSONObject shell = m.optJSONObject("shell");
                String version = shell == null ? "" : shell.optString("version", "");
                PackageManager pm = getContext().getPackageManager();
                String current = pm.getPackageInfo(getContext().getPackageName(), 0).versionName;
                JSObject ret = new JSObject();
                if (version.isEmpty() || compareVersions(version, current) <= 0) {
                    ret.put("state", "current");
                    call.resolve(ret);
                    return;
                }
                JSONObject a = shell.optJSONObject("android");
                String url = a == null ? "" : a.optString("url", "");
                String sha = a == null ? "" : a.optString("sha256", "");
                long size = a == null ? 0 : a.optLong("size", 0);
                if (!url.startsWith(INSTALLER_BASE) || sha.isEmpty()) {
                    call.reject("No Android app is published for this version", "NO_INSTALLER");
                    return;
                }
                // Android 8+: the board must allow this app to install updates (asked once).
                if (Build.VERSION.SDK_INT >= 26 && !pm.canRequestPackageInstalls()) {
                    Intent allow = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                    allow.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(allow);
                    ret.put("state", "permission");
                    ret.put("version", version);
                    call.resolve(ret);
                    return;
                }
                File dir = new File(getContext().getCacheDir(), "app-update");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("No storage");
                File apk = new File(dir, "TrinityTeaching.apk");
                byte[] bytes = download(url, apk);
                if (size > 0 && bytes.length != size) throw new Exception("Download incomplete");
                if (!sha.equalsIgnoreCase(sha256(bytes))) throw new Exception("The downloaded app failed its integrity check");

                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(install);
                ret.put("state", "installing");
                ret.put("version", version);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? "Update failed" : e.getMessage(), "UPDATE_FAILED", e);
            }
        }).start();
    }

    /** Downloads a URL (following redirects). Also saves it to `out` when given; returns the bytes. */
    private static byte[] download(String url, File out) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true);
        c.setConnectTimeout(30000);
        c.setReadTimeout(120000);
        int code = c.getResponseCode();
        if (code != 200) throw new Exception("Download failed (" + code + ")");
        try (InputStream in = c.getInputStream(); ByteArrayOutputStream buf = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[64 * 1024];
            int n;
            while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
            byte[] bytes = buf.toByteArray();
            if (out != null) try (FileOutputStream f = new FileOutputStream(out, false)) { f.write(bytes); }
            return bytes;
        } finally {
            c.disconnect();
        }
    }

    private static String sha256(byte[] bytes) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder s = new StringBuilder();
        for (byte b : d) s.append(String.format("%02x", b));
        return s.toString();
    }

    private static int compareVersions(String a, String b) {
        String[] pa = a.split("\\.");
        String[] pb = (b == null ? "0" : b).split("\\.");
        for (int i = 0; i < Math.max(pa.length, pb.length); i++) {
            int x = i < pa.length ? parse(pa[i]) : 0;
            int y = i < pb.length ? parse(pb[i]) : 0;
            if (x != y) return x > y ? 1 : -1;
        }
        return 0;
    }

    private static int parse(String s) {
        try { return Integer.parseInt(s.replaceAll("[^0-9]", "")); } catch (Exception e) { return 0; }
    }

    private MainActivity main() {
        return (MainActivity) getActivity();
    }
}
