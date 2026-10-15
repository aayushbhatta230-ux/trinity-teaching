package np.edu.trinity.teaching;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

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

    private MainActivity main() {
        return (MainActivity) getActivity();
    }
}
