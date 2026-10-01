package app.shoppingood.mercantil;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep app content inside the system bars. This prevents the WebView,
        // bottom navigation and action buttons from being hidden by cutouts,
        // the status bar or gesture navigation.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.rgb(11, 23, 40));
        getWindow().setNavigationBarColor(Color.rgb(11, 23, 40));
    }
}
