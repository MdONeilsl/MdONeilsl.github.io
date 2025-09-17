/**
 * Media to Prim: Extracts frames from video and GIF images for use in Second Life.
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

const translations = {
    en: {
        title: "GIF and Video Frames Renderer",
        selectFile: "Select GIF or Video:",
        maxImageSize: "Max Image Size:",
        maxFrameSize: "Max Frame Size:",
        fpsTarget: "FPS Target:",
        sideTarget: "Side Target:",
        instructionsTitle: "Instructions:",
        step1: "Setup your preferred settings.",
        step2: "Upload a GIF or video.",
        step3: "Save every image to disk and upload to Second Life.",
        step4: "Copy the text into a notecard.",
        step5: "Copy your uploaded Texture UUID in the notecard on the right id line: \"id\":\"uuid\".",
        step6: "Drop the script and the notecard in an object.",
        scriptLocation: "You can find the script here:",
        canvasInfoPlaceholder: "Canvas Information will appear here."
    },
    fr: {
        title: "Rendu des images GIF et vidéo",
        selectFile: "Sélectionner GIF ou vidéo :",
        maxImageSize: "Taille d'image max :",
        maxFrameSize: "Taille de trame max :",
        fpsTarget: "FPS cible :",
        sideTarget: "Côté cible :",
        instructionsTitle: "Instructions :",
        step1: "Configurez vos paramètres préférés.",
        step2: "Téléchargez un GIF ou une vidéo.",
        step3: "Enregistrez chaque image sur le disque et téléchargez-la sur Second Life.",
        step4: "Copiez le texte dans une notecard.",
        step5: "Copiez votre UUID de texture téléchargée dans la notecard sur la ligne id appropriée : \"id\":\"uuid\".",
        step6: "Déposez le script la une notecard dans un objet.",
        scriptLocation: "Vous pouvez trouver le script ici :",
        canvasInfoPlaceholder: "Les informations sur le canvas apparaîtront ici."
    },
    de: {
        title: "GIF- und Video-Frame-Renderer",
        selectFile: "GIF oder Video auswählen:",
        maxImageSize: "Maximale Bildgröße:",
        maxFrameSize: "Maximale Frame-Größe:",
        fpsTarget: "FPS-Ziel:",
        sideTarget: "Seiten-Ziel:",
        instructionsTitle: "Anleitung:",
        step1: "Richten Sie Ihre bevorzugten Einstellungen ein.",
        step2: "Laden Sie ein GIF oder Video hoch.",
        step3: "Speichern Sie jedes Bild auf der Festplatte und laden Sie es in Second Life hoch.",
        step4: "Kopieren Sie den Text in eine Notizkarte.",
        step5: "Kopieren Sie Ihre hochgeladene Textur-UUID in die Notizkarte auf der richtigen id-Zeile: \"id\":\"uuid\".",
        step6: "Legen Sie das Skript und die Notizkarte in ein Objekt.",
        scriptLocation: "Das Skript finden Sie hier:",
        canvasInfoPlaceholder: "Canvas-Informationen werden hier angezeigt."
    },
    ja: {
        title: "GIF およびビデオフレームレンダラー",
        selectFile: "GIF またはビデオを選択:",
        maxImageSize: "最大画像サイズ:",
        maxFrameSize: "最大フレームサイズ:",
        fpsTarget: "FPS ターゲット:",
        sideTarget: "サイドターゲット:",
        instructionsTitle: "手順:",
        step1: "優先設定を行います。",
        step2: "GIF またはビデオをアップロードします。",
        step3: "すべての画像をディスクに保存し、Second Life にアップロードします。",
        step4: "テキストをノ​​ートカードにコピーします。",
        step5: "アップロードしたテクスチャの UUID をノートカードの適切な id 行にコピーします: \"id\":\"uuid\"。",
        step6: "スクリプトとノ​​ートカードをオブジェクトにドロップします。",
        scriptLocation: "スクリプトはここにあります:",
        canvasInfoPlaceholder: "キャンバスの情報がここに表示されます。"
    },
    es: {
        title: "Renderizador de fotogramas GIF y de video",
        selectFile: "Seleccione GIF o video:",
        maxImageSize: "Tamaño máximo de imagen:",
        maxFrameSize: "Tamaño máximo de fotograma:",
        fpsTarget: "FPS objetivo:",
        sideTarget: "Lado objetivo:",
        instructionsTitle: "Instrucciones:",
        step1: "Configure sus ajustes preferidos.",
        step2: "Cargue un GIF o un video.",
        step3: "Guarde cada imagen en el disco y cárguela en Second Life.",
        step4: "Copie el texto en una tarjeta de notas.",
        step5: "Copie el UUID de la textura cargada en la tarjeta de notas en la línea id correspondiente: \"id\":\"uuid\".",
        step6: "Coloque el script y la tarjeta de notas en un objeto.",
        scriptLocation: "Puede encontrar el script aquí:",
        canvasInfoPlaceholder: "La información del lienzo aparecerá aquí."
    }
};

let currentLanguage = 'en';

const updateText = () => {
    const lang = translations[currentLanguage];
    document.title = lang.title;

    const labels = {
        'input': lang.selectFile,
        'maxCanvasSize': lang.maxImageSize,
        'maxFrameSize': lang.maxFrameSize,
        'videoFps': lang.fpsTarget,
        'objectSide': lang.sideTarget
    };

    for (const [id, text] of Object.entries(labels)) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) label.textContent = text;
    }

    const instructions = document.querySelector('#instructions');
    if (instructions) {
        let el = instructions.querySelector('h2');
        if (el) {
            el.textContent = lang.instructionsTitle;
            const steps = instructions.querySelectorAll('ul li');
            [lang.step1, lang.step2, lang.step3, lang.step4, lang.step5, lang.step6]
                .forEach((step, i) => steps[i].textContent = step);
            instructions.querySelector('p').textContent = lang.scriptLocation;
        }


    }

    const canvasInfo = document.querySelector('#canvasInfo');
    if (canvasInfo) canvasInfo.placeholder = lang.canvasInfoPlaceholder;

    const langButton = document.querySelector('#langButton');
    if (langButton) langButton.textContent = currentLanguage.toUpperCase();

    const langMenu = document.querySelector('.language-menu');
    if (langMenu) {
        langMenu.querySelectorAll('li').forEach(item => {
            item.classList.toggle('selected', item.dataset.lang === currentLanguage);
        });
    }
};

const createLanguageMenu = () => {
    const controls = document.querySelector('#controls');
    if (!controls) return;

    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'language-selector';

    const langButton = document.createElement('button');
    langButton.id = 'langButton';
    langButton.textContent = currentLanguage.toUpperCase();

    const menu = document.createElement('div');
    menu.className = 'language-menu';
    const ul = document.createElement('ul');

    Object.keys(translations).forEach(lang => {
        const li = document.createElement('li');
        li.textContent = lang.toUpperCase();
        li.dataset.lang = lang;
        li.addEventListener('click', () => {
            currentLanguage = lang;
            updateText();
            menu.classList.remove('show');
        });
        ul.appendChild(li);
    });

    menu.appendChild(ul);
    selectorDiv.appendChild(langButton);
    selectorDiv.appendChild(menu);
    controls.insertBefore(selectorDiv, controls.firstChild);

    langButton.addEventListener('click', () => {
        menu.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!selectorDiv.contains(event.target)) {
            menu.classList.remove('show');
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    createLanguageMenu();
    updateText();
});
