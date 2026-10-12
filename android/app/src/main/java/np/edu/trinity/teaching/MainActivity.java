package np.edu.trinity.teaching;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Trinity Teaching on classroom boards.
 *
 * The status bar is hidden and the screen stays on. The navigation bar stays available by default,
 * so the board's own tools (for example the Hikvision annotation pen and side toolbar) keep working
 * while the app is open. Full screen presentation hides every system bar; the app can bring the
 * bars back at any time through the Board plugin ("Board pen"), and they then stay until the app
 * asks to hide them again.
 */
public class MainActivity extends BridgeActivity {

    /** True while the app wants every system bar hidden (full screen presentation). */
    private boolean immersive = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BoardPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Re-apply after the board's own overlays (annotation, menus) close, without forcing
        // full screen over them while they are in use.
        if (hasFocus) applyBars();
    }

    /** Called by BoardPlugin: hide all system bars (true) or keep the board's tools available (false). */
    void setImmersive(boolean on) {
        immersive = on;
        runOnUiThread(this::applyBars);
    }

    private void applyBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.statusBars());
        if (immersive) controller.hide(WindowInsetsCompat.Type.navigationBars());
        else controller.show(WindowInsetsCompat.Type.navigationBars());
    }
}
