/*
    Fragmented Frame: Create unique fragmented frame designs for Second Life with custom textures.
    Copyright (C) 2025  MdONeil 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/

// Translation dictionary
const translations = {
    en: {
        title: "Fragmented frame",
        circle: "Circle",
        rectangle: "Rectangle",
        triangle: "Triangle",
        pentagon: "Pentagon",
        hexagon: "Hexagon",
        "upload-texture": "Upload Texture",
        "export-mesh": "Export Mesh",
        "lang-en": "English",
        "lang-es": "Spanish",
        "lang-fr": "French",
        "lang-ja": "Japanese",
        "lang-de": "German",
        "lang-pt": "Portuguese",
        "tutorial-heading": "Fragmented frame App Tutorial",
        "tutorial-purpose": "Draw 2D shapes, apply a texture, and export as a 3D mesh (.dae) for Blender.",
        "tutorial-draw": "Select a shape from the toolbar, then click and drag on the canvas.",
        "tutorial-select": "Click a shape to select it (highlighted in red).",
        "tutorial-move": "Drag a selected shape to reposition it.",
        "tutorial-scale": "Hold <kbd>S</kbd> and drag to scale a selected shape.",
        "tutorial-rotate": "Hold <kbd>R</kbd> and drag to rotate a selected shape.",
        "tutorial-copy-paste": "Press <kbd>Ctrl + C</kbd> to copy a selected shape, <kbd>Ctrl + V</kbd> to paste it.",
        "tutorial-delete": "Press <kbd>Delete</kbd> to remove a selected shape.",
        "tutorial-texture": "Upload an image to apply as the canvas texture.",
        "tutorial-export": "Click \"Export Mesh\" to download the 3D mesh. Save the texture image in the same directory as the .dae file."
    },
    es: {
        title: "Fragmented frame",
        circle: "Círculo",
        rectangle: "Rectángulo",
        triangle: "Triángulo",
        pentagon: "Pentágono",
        hexagon: "Hexágono",
        "upload-texture": "Cargar Textura",
        "export-mesh": "Exportar Malla",
        "lang-en": "Inglés",
        "lang-es": "Español",
        "lang-fr": "Francés",
        "lang-ja": "Japonés",
        "lang-de": "Alemán",
        "lang-pt": "Portugués",
        "tutorial-heading": "Tutorial de la Aplicación Fragmented frame",
        "tutorial-purpose": "Dibuja formas 2D, aplica una textura y exporta como malla 3D (.dae) para Blender.",
        "tutorial-draw": "Selecciona una forma en la barra de herramientas, luego haz clic y arrastra en el lienzo.",
        "tutorial-select": "Haz clic en una forma para seleccionarla (se resalta en rojo).",
        "tutorial-move": "Arrastra una forma seleccionada para reposicionarla.",
        "tutorial-scale": "Mantén presionada <kbd>S</kbd> y arrastra para escalar una forma seleccionada.",
        "tutorial-rotate": "Mantén presionada <kbd>R</kbd> y arrastra para rotar una forma seleccionada.",
        "tutorial-copy-paste": "Presiona <kbd>Ctrl + C</kbd> para copiar una forma seleccionada, <kbd>Ctrl + V</kbd> para pegarla.",
        "tutorial-delete": "Presiona <kbd>Suprimir</kbd> para eliminar una forma seleccionada.",
        "tutorial-texture": "Carga una imagen para aplicarla como textura del lienzo.",
        "tutorial-export": "Haz clic en \"Exportar Malla\" para descargar la malla 3D. Guarda la imagen de textura en el mismo directorio que el archivo .dae."
    },
    fr: {
        title: "Fragmented frame",
        circle: "Cercle",
        rectangle: "Rectangle",
        triangle: "Triangle",
        pentagon: "Pentagone",
        hexagon: "Hexagone",
        "upload-texture": "Télécharger la Texture",
        "export-mesh": "Exporter le Maillage",
        "lang-en": "Anglais",
        "lang-es": "Espagnol",
        "lang-fr": "Français",
        "lang-ja": "Japonais",
        "lang-de": "Allemand",
        "lang-pt": "Portugais",
        "tutorial-heading": "Tutoriel de l'Application Fragmented frame",
        "tutorial-purpose": "Dessinez des formes 2D, appliquez une texture et exportez en maillage 3D (.dae) pour Blender.",
        "tutorial-draw": "Sélectionnez une forme dans la barre d'outils, puis cliquez et faites glisser sur le canevas.",
        "tutorial-select": "Cliquez sur une forme pour la sélectionner (mise en surbrillance en rouge).",
        "tutorial-move": "Faites glisser une forme sélectionnée pour la repositionner.",
        "tutorial-scale": "Maintenez <kbd>S</kbd> enfoncé et faites glisser pour mettre à l'échelle une forme sélectionnée.",
        "tutorial-rotate": "Maintenez <kbd>R</kbd> enfoncé et faites glisser pour faire pivoter une forme sélectionnée.",
        "tutorial-copy-paste": "Appuyez sur <kbd>Ctrl + C</kbd> pour copier une forme sélectionnée, <kbd>Ctrl + V</kbd> pour la coller.",
        "tutorial-delete": "Appuyez sur <kbd>Suppr</kbd> pour supprimer une forme sélectionnée.",
        "tutorial-texture": "Téléchargez une image pour l'appliquer comme texture du canevas.",
        "tutorial-export": "Cliquez sur \"Exporter le Maillage\" pour télécharger le maillage 3D. Enregistrez l'image de texture dans le même répertoire que le fichier .dae."
    },
    ja: {
        title: "Fragmented frame",
        circle: "円",
        rectangle: "長方形",
        triangle: "三角形",
        pentagon: "五角形",
        hexagon: "六角形",
        "upload-texture": "テクスチャをアップロード",
        "export-mesh": "メッシュをエクスポート",
        "lang-en": "英語",
        "lang-es": "スペイン語",
        "lang-fr": "フランス語",
        "lang-ja": "日本語",
        "lang-de": "ドイツ語",
        "lang-pt": "ポルトガル語",
        "tutorial-heading": "Fragmented frameアプリのチュートリアル",
        "tutorial-purpose": "2Dシェイプを描き、テクスチャを適用し、Blender用の3Dメッシュ（.dae）としてエクスポートします。",
        "tutorial-draw": "ツールバーからシェイプを選択し、キャンバス上でクリックしてドラッグします。",
        "tutorial-select": "シェイプをクリックして選択します（赤くハイライトされます）。",
        "tutorial-move": "選択したシェイプをドラッグして位置を変更します。",
        "tutorial-scale": "<kbd>S</kbd>を押しながらドラッグして選択したシェイプをスケールします。",
        "tutorial-rotate": "<kbd>R</kbd>を押しながらドラッグして選択したシェイプを回転します。",
        "tutorial-copy-paste": "<kbd>Ctrl + C</kbd>を押して選択したシェイプをコピーし、<kbd>Ctrl + V</kbd>で貼り付けます。",
        "tutorial-delete": "<kbd>Delete</kbd>を押して選択したシェイプを削除します。",
        "tutorial-texture": "画像をアップロードしてキャンバスのテクスチャとして適用します。",
        "tutorial-export": "「メッシュをエクスポート」をクリックして3Dメッシュをダウンロードします。テクスチャ画像を.daeファイルと同じディレクトリに保存します。"
    },
    de: {
        title: "Fragmented frame",
        circle: "Kreis",
        rectangle: "Rechteck",
        triangle: "Dreieck",
        pentagon: "Fünfeck",
        hexagon: "Sechseck",
        "upload-texture": "Textur hochladen",
        "export-mesh": "Mesh exportieren",
        "lang-en": "Englisch",
        "lang-es": "Spanisch",
        "lang-fr": "Französisch",
        "lang-ja": "Japanisch",
        "lang-de": "Deutsch",
        "lang-pt": "Portugiesisch",
        "tutorial-heading": "Tutorial für die Fragmented frame-App",
        "tutorial-purpose": "Zeichnen Sie 2D-Formen, wenden Sie eine Textur an und exportieren Sie sie als 3D-Mesh (.dae) für Blender.",
        "tutorial-draw": "Wählen Sie eine Form in der Werkzeugleiste aus und klicken und ziehen Sie dann auf die Leinwand.",
        "tutorial-select": "Klicken Sie auf eine Form, um sie auszuwählen (in Rot hervorgehoben).",
        "tutorial-move": "Ziehen Sie eine ausgewählte Form, um sie zu verschieben.",
        "tutorial-scale": "Halten Sie <kbd>S</kbd> gedrückt und ziehen Sie, um eine ausgewählte Form zu skalieren.",
        "tutorial-rotate": "Halten Sie <kbd>R</kbd> gedrückt und ziehen Sie, um eine ausgewählte Form zu drehen.",
        "tutorial-copy-paste": "Drücken Sie <kbd>Ctrl + C</kbd>, um eine ausgewählte Form zu kopieren, und <kbd>Ctrl + V</kbd>, um sie einzufügen.",
        "tutorial-delete": "Drücken Sie <kbd>Entf</kbd>, um eine ausgewählte Form zu löschen.",
        "tutorial-texture": "Laden Sie ein Bild hoch, um es als Textur der Leinwand anzuwenden.",
        "tutorial-export": "Klicken Sie auf „Mesh exportieren“, um das 3D-Mesh herunterzuladen. Speichern Sie das Texturbild im selben Verzeichnis wie die .dae-Datei."
    },
    pt: {
        title: "Fragmented frame",
        circle: "Círculo",
        rectangle: "Retângulo",
        triangle: "Triângulo",
        pentagon: "Pentágono",
        hexagon: "Hexágono",
        "upload-texture": "Carregar Textura",
        "export-mesh": "Exportar Malha",
        "lang-en": "Inglês",
        "lang-es": "Espanhol",
        "lang-fr": "Francês",
        "lang-ja": "Japonês",
        "lang-de": "Alemão",
        "lang-pt": "Português",
        "tutorial-heading": "Tutorial do Aplicativo Fragmented frame",
        "tutorial-purpose": "Desenhe formas 2D, aplique uma textura e exporte como malha 3D (.dae) para o Blender.",
        "tutorial-draw": "Selecione uma forma na barra de ferramentas, depois clique e arraste na tela.",
        "tutorial-select": "Clique em uma forma para selecioná-la (destacada em vermelho).",
        "tutorial-move": "Arraste uma forma selecionada para reposicioná-la.",
        "tutorial-scale": "Segure <kbd>S</kbd> e arraste para dimensionar uma forma selecionada.",
        "tutorial-rotate": "Segure <kbd>R</kbd> e arraste para girar uma forma selecionada.",
        "tutorial-copy-paste": "Pressione <kbd>Ctrl + C</kbd> para copiar uma forma selecionada, <kbd>Ctrl + V</kbd> para colá-la.",
        "tutorial-delete": "Pressione <kbd>Delete</kbd> para remover uma forma selecionada.",
        "tutorial-texture": "Carregue uma imagem para aplicá-la como textura da tela.",
        "tutorial-export": "Clique em \"Exportar Malha\" para baixar a malha 3D. Salve a imagem de textura no mesmo diretório que o arquivo .dae."
    }
};

// Function to update UI with translations
function updateLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            if (element.tagName === 'INPUT' && element.type === 'file') {
                element.setAttribute('title', translations[lang][key]);
            } else if (element.tagName === 'TITLE') {
                document.title = translations[lang][key];
            } else {
                // Preserve <kbd> tags in tutorial text
                if (element.tagName === 'LI' && element.innerHTML.includes('<kbd>')) {
                    const kbdContents = Array.from(element.querySelectorAll('kbd')).map(kbd => kbd.textContent);
                    let translated = translations[lang][key];
                    kbdContents.forEach((content, index) => {
                        translated = translated.replace(`<kbd>${content}</kbd>`, `<kbd>${content}</kbd>`);
                    });
                    element.innerHTML = translated;
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        }
    });
}

// Initialize language selector
document.addEventListener('DOMContentLoaded', () => {
    const languageSelector = document.getElementById('language-selector');
    
    // Set default language to English
    languageSelector.value = 'en';
    updateLanguage('en');

    // Update UI on language change
    languageSelector.addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        updateLanguage(selectedLang);
    });
});