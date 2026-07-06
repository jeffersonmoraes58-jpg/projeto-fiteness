"""
Script para gerar ícones do FitlyNutri TWA em todas as resoluções necessárias.
Usa o logo oficial do site (icon-512.png) como base.
Requisitos: pip install Pillow
"""

import os
from PIL import Image

# Caminho do logo oficial do site
LOGO_PATH = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'icons', 'icon-512.png')

# Diretório base dos mipmaps
BASE_DIR = os.path.join(os.path.dirname(__file__), 'android', 'app', 'src', 'main', 'res')

# Resoluções Android: mipmap-mdpi (1x), hdpi (1.5x), xhdpi (2x), xxhdpi (3x), xxxhdpi (4x)
ICON_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

PLAYSTORE_ICON_SIZE = 512  # Para Play Store listing


def resize_logo(size):
    """Redimensiona o logo do site para o tamanho especificado, mantendo proporção e adicionando padding."""
    logo = Image.open(LOGO_PATH).convert('RGBA')
    
    # Redimensiona mantendo proporção, com um pequeno padding (10%)
    padding = int(size * 0.08)
    target_size = size - (padding * 2)
    
    logo.thumbnail((target_size, target_size), Image.LANCZOS)
    
    # Cria uma imagem quadrada com fundo transparente
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Centraliza o logo
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    img.paste(logo, (x, y), logo)
    
    return img


def main():
    print("🎨 Gerando ícones do FitlyNutri TWA a partir do logo do site...\n")
    
    if not os.path.exists(LOGO_PATH):
        print(f"❌ Logo não encontrado em: {LOGO_PATH}")
        print("   Baixe o logo do site primeiro ou verifique o caminho.")
        return
    
    print(f"   Logo base: {LOGO_PATH}")
    
    for folder, size in ICON_SIZES.items():
        folder_path = os.path.join(BASE_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Ícone normal
        icon = resize_logo(size)
        icon_path = os.path.join(folder_path, 'ic_launcher.png')
        icon.save(icon_path, 'PNG')
        print(f"  ✅ {folder}/ic_launcher.png ({size}x{size})")
        
        # Ícone redondo (mesmo ícone, o Android aplica o círculo)
        icon_round = resize_logo(size)
        icon_round_path = os.path.join(folder_path, 'ic_launcher_round.png')
        icon_round.save(icon_round_path, 'PNG')
        print(f"  ✅ {folder}/ic_launcher_round.png ({size}x{size})")
        
        # Foreground (para adaptive icons)
        foreground = resize_logo(size)
        foreground_path = os.path.join(folder_path, 'ic_launcher_foreground.png')
        foreground.save(foreground_path, 'PNG')
        print(f"  ✅ {folder}/ic_launcher_foreground.png ({size}x{size})")
    
    # Ícone para Play Store (512x512)
    playstore_icon = resize_logo(PLAYSTORE_ICON_SIZE)
    playstore_path = os.path.join(BASE_DIR, '..', 'playstore-icon.png')
    playstore_icon.save(playstore_path, 'PNG')
    print(f"\n  ✅ playstore-icon.png ({PLAYSTORE_ICON_SIZE}x{PLAYSTORE_ICON_SIZE})")
    
    print("\n✨ Todos os ícones gerados com sucesso!")
    print(f"   Fonte: {LOGO_PATH}")


if __name__ == '__main__':
    main()
