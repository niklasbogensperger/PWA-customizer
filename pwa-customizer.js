// ==UserScript==
// @name         PWA Customizer for iOS
// @namespace    com.niklasbogensperger.pwa-customizer
// @version      1.0
// @description  Injects Apple-style PWA meta tags and modifies PWA properties via a predefined manifest.json.
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    const baseRepo = 'https://raw.githubusercontent.com/niklasbogensperger/pwa-customizer/main/';
    const manifestsRepo = baseRepo + 'manifests/';
    const iconsRepo = baseRepo + 'icons/'
    const siteName = (window.location.hostname + window.location.pathname).replace(/[^\w-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let debugInfo = {
        pwaMetaDebug: "Pending...",
        statusBarMetaDebug: "Pending...",
        manifestLinkDebug: "Pending...",
    };
    let debugBannerText = () => `<b>Injection Active!</b>
<b>PWA:</b> ${debugInfo.pwaMetaDebug}
<b>Status Bar:</b> ${debugInfo.statusBarMetaDebug}
<b>Manifest:</b> ${debugInfo.manifestLinkDebug}`;

    // Utility: Wait for document elements (head, body)
    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
            return;
        }
        const observer = new MutationObserver((_, obs) => {
            if (document.querySelector(selector)) {
                obs.disconnect();
                callback();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Helper: Debug banner updater
    function updateDebugBanner() {
        if (window.debugBannerElement) window.debugBannerElement.innerHTML = debugBannerText();
    }

    // Feature: Debug banner
    function addDebugBanner() {
        document.body.insertAdjacentHTML("beforeend", `
            <div id="debugBanner" style="
                position: fixed; bottom: 0; left: 0; right: 0; background-color: lime;
                color: black; font-size: 16px; padding: 0.5em; text-align: left;
                white-space: pre-wrap; z-index: 9999;">
${debugBannerText()}
            </div>
        `);
        window.debugBannerElement = document.getElementById("debugBanner");
    }

    // Helper: Meta tag inserter
    function insertMetaTag(name, content, debugKey, debugMessage) {
        if (document.querySelector(`meta[name="${name}"][content="${content}"]`)) {
            debugInfo[debugKey] = `${debugMessage} already exists; skipped insertion.`;
        } else {
            let metaTag = document.createElement('meta');
            metaTag.name = name;
            metaTag.content = content;
            document.head.appendChild(metaTag);
            debugInfo[debugKey] = `${debugMessage} inserted.`;
        }
        updateDebugBanner();
    }

    // Feature: Insert meta tag enabling PWA
    function insertPWAMetaTag() {
        insertMetaTag("apple-mobile-web-app-capable", "yes", "pwaMetaDebug", "PWA meta tag");
    }

    // Feature: Insert meta tag setting status bar style to black-translucent
    function insertStatusBarMetaTag() {
        insertMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent", "statusBarMetaDebug", "Status bar style meta tag");
    }

    // Helper: manifest.json fetcher
    async function fetchManifest(url) {
        let response = await fetch(url);
        if (response.ok) return response.text();
        throw new Error();
    }

    // Feature: Insert link tag injecting a manifest.json
    async function insertManifestLinkTag() {
        if (document.querySelector('link[rel="manifest"]')) {
            debugInfo.manifestLinkDebug = "Manifest already provided by website; skipped insertion.";
            updateDebugBanner();
            return;
        }
        let manifestText, manifestNameDebug;
        try {
            manifestText = await fetchManifest(manifestsRepo + siteName + '.json');
            manifestNameDebug = siteName + '.json';
        } catch {
            try {
                manifestText = await fetchManifest(manifestsRepo + 'default.json');
                manifestNameDebug = 'default.json';
            } catch {
                debugInfo.manifestLinkDebug = "Failed to fetch custom manifests; skipped insertion.";
                updateDebugBanner();
                return;
            }
        }
        manifestText = manifestText.replace(/{BASE_URL}/g, iconsRepo + siteName);
        let blob = new Blob([manifestText], { type: 'application/json' });
        let manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = URL.createObjectURL(blob);
        document.head.appendChild(manifestLink);
        debugInfo.manifestLinkDebug = `Manifest link to ${manifestNameDebug} inserted.`;
        updateDebugBanner();
    }

    // Wait for document.head, then run functions
    waitForElement("head", async function() {
        insertPWAMetaTag();
        insertStatusBarMetaTag();
        await insertManifestLinkTag();
    });

    // Wait for document.body before inserting the debug banner
    waitForElement("body", addDebugBanner);
})();
