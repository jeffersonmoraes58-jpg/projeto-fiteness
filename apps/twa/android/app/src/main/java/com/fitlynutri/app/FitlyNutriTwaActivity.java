package com.fitlynutri.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;

import androidx.appcompat.app.AlertDialog;
import androidx.core.splashscreen.SplashScreen;

import com.google.androidbrowserhelper.trusted.LauncherActivity;
import com.google.androidbrowserhelper.trusted.TwaLauncher;

/**
 * FitlyNutri TWA Activity
 * 
 * Usa o Brave Browser como navegador principal para o TWA.
 * Sobrescreve createTwaLauncher() para passar o package do Brave
 * como provider, garantindo que o TWA seja aberto no Brave em vez do Chrome.
 * Se o Brave não estiver instalado, usa Chrome como fallback.
 * Se nenhum dos dois estiver disponível, mostra diálogo orientando
 * o usuário a instalar o Brave.
 */
public class FitlyNutriTwaActivity extends LauncherActivity {

    private static final String BRAVE_PACKAGE = "com.brave.browser";
    private static final String CHROME_PACKAGE = "com.android.chrome";
    private static final String SITE_URL = "https://fitlynutri.com.br";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Aplica a splash screen antes de qualquer coisa
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }

    /**
     * CRÍTICO: Sobrescreve o método que cria o TwaLauncher para usar
     * o Brave Browser como provider package em vez do Chrome padrão.
     * 
     * O TwaLauncher com provider package = Brave faz com que o TWA
     * abra no Brave em vez do Chrome.
     */
    @Override
    protected TwaLauncher createTwaLauncher() {
        String providerPackage = getPreferredBrowser();
        
        if (providerPackage != null) {
            // Cria TwaLauncher com o navegador preferido (Brave ou Chrome)
            return new TwaLauncher(this, providerPackage);
        }
        
        // Fallback: TwaLauncher padrão (usa Chrome)
        return new TwaLauncher(this);
    }

    /**
     * Escolhe o navegador: Brave primeiro, Chrome como fallback.
     * Se nenhum estiver instalado, retorna null.
     */
    private String getPreferredBrowser() {
        PackageManager pm = getPackageManager();

        // 1. Tenta Brave primeiro
        if (isPackageInstalled(pm, BRAVE_PACKAGE)) {
            return BRAVE_PACKAGE;
        }

        // 2. Fallback para Chrome
        if (isPackageInstalled(pm, CHROME_PACKAGE)) {
            return CHROME_PACKAGE;
        }

        // 3. Nenhum navegador compatível
        return null;
    }

    /**
     * Verifica se um pacote está instalado no dispositivo.
     */
    private boolean isPackageInstalled(PackageManager pm, String packageName) {
        try {
            pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /**
     * Mostra um diálogo informando que o Brave é necessário
     * e oferece link para instalar.
     */
    private void showBraveRequiredDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Navegador necessário")
            .setMessage(
                "Para usar o FitlyNutri, instale o Brave Browser.\n\n" +
                "O Brave é um navegador rápido, seguro e que " +
                "oferece a melhor experiência com o FitlyNutri."
            )
            .setPositiveButton("Instalar Brave", (dialog, which) -> {
                openPlayStore(BRAVE_PACKAGE);
            })
            .setNegativeButton("Sair", (dialog, which) -> {
                finish();
            })
            .setCancelable(false)
            .show();
    }

    /**
     * Abre a Play Store na página do app especificado.
     */
    private void openPlayStore(String packageName) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("market://details?id=" + packageName));
            startActivity(intent);
        } catch (Exception e) {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(
                "https://play.google.com/store/apps/details?id=" + packageName
            ));
            startActivity(intent);
        }
    }

    /**
     * Quando a Activity é iniciada, verifica se o Brave está disponível.
     * Se não estiver, mostra o diálogo.
     */
    @Override
    protected void onStart() {
        super.onStart();

        // Verifica se há um navegador compatível instalado
        String browser = getPreferredBrowser();
        if (browser == null) {
            showBraveRequiredDialog();
        }
    }
}
