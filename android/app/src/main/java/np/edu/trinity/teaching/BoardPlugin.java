package np.edu.trinity.teaching;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the web app choose how much of the board's system UI is visible:
 *   Board.setImmersive({ on: true })  → full screen presentation, every bar hidden
 *   Board.setImmersive({ on: false }) → the board's own tools (annotation pen, side bar) available
 */
@CapacitorPlugin(name = "Board")
public class BoardPlugin extends Plugin {

    @PluginMethod
    public void setImmersive(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        ((MainActivity) getActivity()).setImmersive(on);
        JSObject ret = new JSObject();
        ret.put("immersive", on);
        call.resolve(ret);
    }
}
