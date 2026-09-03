package com.fitlynutri.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * FitlyNutri — Activity principal (WebView).
 *
 * Substitui o antigo wrapper TWA (Trusted Web Activity). Em vez de abrir o
 * site dentro do Chrome/Brave, o site roda dentro do próprio app usando um
 * WebView nativo. Isso é o que faz o Google Play conseguir enxergar o uso
 * real do app pelos testadores (com TWA, a atividade fica registrada como
 * uso do navegador, não do app).
 *
 * Login com Google continua funcionando: como o WebView puro bloqueia a
 * tela de login do Google (erro "disallowed_useragent"), esses domínios são
 * abertos numa Custom Tab. O domínio fitlynutri.com.br já é verificado via
 * Digital Asset Links (assetlinks.json), então o retorno do login é
 * capturado de volta pelo próprio app como App Link (ver onNewIntent).
 */
public class MainActivity extends AppCompatActivity {

    private static final String SITE_URL = "https://fitlynutri.com.br";
    private static final String HOST = "fitlynutri.com.br";

    // Domínios que precisam abrir numa Custom Tab em vez de dentro do WebView
    // (Google e outros provedores de login bloqueiam WebView puro por segurança)
    private static final String[] EXTERNAL_AUTH_HOSTS = {
            "accounts.google.com",
            "appleid.apple.com",
    };

    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private View offlineView;

    private ValueCallback<Uri[]> fileUploadCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<Intent> cameraCaptureLauncher;
    private ActivityResultLauncher<String> cameraPermissionLauncher;

    // Guarda o pedido de captura de foto enquanto aguarda a permissão de câmera ser concedida
    private WebChromeClient.FileChooserParams pendingCaptureParams;
    // Uri do arquivo temporário onde a foto tirada é salva
    private Uri pendingCameraPhotoUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        swipeRefreshLayout = findViewById(R.id.swipe_refresh);
        offlineView = findViewById(R.id.offline_view);
        Button retryButton = findViewById(R.id.retry_button);

        setupEdgeToEdgeInsets();
        setupFileChooserLaunchers();
        setupWebView();
        setupBackNavigation();

        retryButton.setOnClickListener(v -> loadSite());
        swipeRefreshLayout.setOnRefreshListener(() -> webView.reload());

        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /**
     * Se o app foi aberto por um link do próprio domínio (ex: retorno do
     * login OAuth do Google), carrega essa URL exata no WebView em vez de
     * simplesmente abrir a home. É assim que a sessão/login "gruda" no
     * WebView depois de o usuário logar na Custom Tab.
     */
    private void handleIntent(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        if (data != null && data.getHost() != null && data.getHost().endsWith(HOST)) {
            webView.loadUrl(data.toString());
        } else if (webView.getUrl() == null) {
            loadSite();
        }
    }

    private void loadSite() {
        webView.loadUrl(SITE_URL);
    }

    /**
     * Nome da versão do app (ex: "1.1.2"), lido do PackageManager em vez de
     * fixo no código — assim o sufixo do user-agent (usado por analytics e
     * possíveis banners de "atualize o app") nunca fica desatualizado quando
     * o versionName muda no build.gradle.
     */
    private String getAppVersionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "unknown";
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " FitlyNutriApp/" + getAppVersionName());

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new AppWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());
    }

    /**
     * A partir do Android 15 (targetSdk 35) os apps desenham "de ponta a
     * ponta" por padrão — o conteúdo pode ficar embaixo da barra de status
     * (relógio, sinal, bateria) e da barra de navegação. Aqui a gente
     * empurra o conteúdo pra baixo/cima dessas áreas manualmente, do mesmo
     * jeito que o app se comportava antes (barra de status com a cor do
     * app, conteúdo nunca sobreposto).
     */
    private void setupEdgeToEdgeInsets() {
        View root = findViewById(R.id.root_container);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return windowInsets;
        });
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    private class AppWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String host = uri.getHost();
            if (host == null) {
                return false;
            }

            // Navegação dentro do próprio site continua no WebView
            if (host.equals(HOST) || host.endsWith("." + HOST)) {
                return false;
            }

            // Login do Google/Apple abre numa Custom Tab
            for (String authHost : EXTERNAL_AUTH_HOSTS) {
                if (host.equals(authHost) || host.endsWith("." + authHost)) {
                    openInCustomTab(uri);
                    return true;
                }
            }

            // Qualquer outro link externo abre no navegador padrão do aparelho
            openExternally(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            showContent();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            swipeRefreshLayout.setRefreshing(false);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                swipeRefreshLayout.setRefreshing(false);
                showOffline();
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            // Nunca ignora erro de SSL silenciosamente — cancela e mostra a tela offline
            handler.cancel();
            swipeRefreshLayout.setRefreshing(false);
            showOffline();
        }
    }

    private class AppWebChromeClient extends WebChromeClient {

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                          FileChooserParams fileChooserParams) {
            fileUploadCallback = filePathCallback;

            // O site pede a câmera diretamente (ex: selfie do treino, input com
            // capture="user") — abre o app de câmera direto, sem passar pelo
            // seletor genérico de arquivos/galeria.
            if (fileChooserParams.isCaptureEnabled()) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    // Guarda o pedido e só abre a câmera depois que a permissão for concedida
                    pendingCaptureParams = fileChooserParams;
                    cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA);
                } else {
                    launchCamera();
                }
                return true;
            }

            // Upload comum (ex: anexo de chat) — mostra o seletor normal (câmera, galeria, arquivos)
            try {
                fileChooserLauncher.launch(fileChooserParams.createIntent());
            } catch (Exception e) {
                fileUploadCallback = null;
                return false;
            }
            return true;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            // Concede acesso à câmera/microfone quando o site pede via getUserMedia
            runOnUiThread(() -> request.grant(request.getResources()));
        }
    }

    private void setupFileChooserLaunchers() {
        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (fileUploadCallback == null) {
                        return;
                    }
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null
                            && result.getData().getData() != null) {
                        results = new Uri[]{result.getData().getData()};
                    }
                    fileUploadCallback.onReceiveValue(results);
                    fileUploadCallback = null;
                });

        cameraCaptureLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (fileUploadCallback == null) {
                        return;
                    }
                    // Para MediaStore.ACTION_IMAGE_CAPTURE a foto vai direto pro Uri que
                    // a gente forneceu (pendingCameraPhotoUri), não no result.getData()
                    Uri[] results = (result.getResultCode() == RESULT_OK && pendingCameraPhotoUri != null)
                            ? new Uri[]{pendingCameraPhotoUri}
                            : null;
                    fileUploadCallback.onReceiveValue(results);
                    fileUploadCallback = null;
                    pendingCameraPhotoUri = null;
                });

        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted && pendingCaptureParams != null) {
                        launchCamera();
                    } else if (!granted) {
                        Toast.makeText(this,
                                "Permita o acesso à câmera nas configurações do app para tirar a selfie.",
                                Toast.LENGTH_LONG).show();
                        if (fileUploadCallback != null) {
                            fileUploadCallback.onReceiveValue(null);
                            fileUploadCallback = null;
                        }
                    }
                    pendingCaptureParams = null;
                });
    }

    /**
     * Abre o app de câmera do aparelho direto (sem seletor), salvando a foto
     * num arquivo temporário que depois é devolvido pro WebView.
     */
    private void launchCamera() {
        File photoFile;
        try {
            photoFile = createTempPhotoFile();
        } catch (IOException e) {
            fileUploadCallback.onReceiveValue(null);
            fileUploadCallback = null;
            return;
        }

        pendingCameraPhotoUri = FileProvider.getUriForFile(
                this, "com.fitlynutri.app.fileprovider", photoFile);

        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraPhotoUri);
        // Pede câmera frontal quando disponível (extras não oficiais, mas aceitos
        // pela maioria dos apps de câmera — best effort, não é garantido)
        cameraIntent.putExtra("android.intent.extras.CAMERA_FACING", 1);
        cameraIntent.putExtra("android.intent.extra.USE_FRONT_CAMERA", true);
        cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

        if (cameraIntent.resolveActivity(getPackageManager()) == null) {
            fileUploadCallback.onReceiveValue(null);
            fileUploadCallback = null;
            return;
        }

        cameraCaptureLauncher.launch(cameraIntent);
    }

    private File createTempPhotoFile() throws IOException {
        File dir = new File(getCacheDir(), "camera_photos");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        String fileName = "SELFIE_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        return File.createTempFile(fileName, ".jpg", dir);
    }

    private void openInCustomTab(Uri uri) {
        new CustomTabsIntent.Builder().build().launchUrl(this, uri);
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            // Nenhum app instalado consegue abrir esse link — ignora silenciosamente
        }
    }

    private void showOffline() {
        webView.setVisibility(View.GONE);
        offlineView.setVisibility(View.VISIBLE);
    }

    private void showContent() {
        webView.setVisibility(View.VISIBLE);
        offlineView.setVisibility(View.GONE);
    }
}
