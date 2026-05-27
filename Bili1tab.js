// ==UserScript==
// @name         Bili1Tab (强制同标签)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  B 站标签是弱能人仕寫的.  强制 B 站所有链接在当前标签页打开，禁止新标签.
// @author       You
// @match        *://*.bilibili.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 统一处理一个 <a> 元素
    function normalizeLink(link) {
        if (!link || !link.href) return;
        const target = link.getAttribute('target');
        if (target && target !== '_self') {
            link.removeAttribute('target');
        }
        if (link.hasAttribute('rel')) {
            link.removeAttribute('rel');
        }
    }

    // 处理当前页面已有的所有链接
    function fixAllLinks() {
        document.querySelectorAll('a[target], a[rel]').forEach(normalizeLink);
    }

    // 监听 DOM 变化，持续修正新出现的链接
    function observeLinks() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        if (node.tagName === 'A') {
                            normalizeLink(node);
                        }
                        const innerLinks = node.querySelectorAll
                            ? node.querySelectorAll('a[target], a[rel]')
                            : [];
                        innerLinks.forEach(normalizeLink);
                    });
                }
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    // 拦截点击：只要是 a，且 target 不是 _self，就强制当前标签
    function interceptClicks() {
        document.addEventListener(
            'click',
            (e) => {
                const t = e.target;
                const link = t.closest ? t.closest('a') : null;
                if (!link || !link.href) return;

                const target = link.getAttribute('target');
                if (target && target !== '_self') {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = link.href;
                    console.log('[Bilibili No New Tab] click -> current tab:', link.href);
                }
            },
            true // 捕获阶段
        );
    }

    // 重写 window.open：禁止打开新标签
    function hookWindowOpen() {
        const originalOpen = window.open;
        window.open = function (url, target, features) {
            console.log('[Bilibili No New Tab] window.open intercepted:', url, target);
            // target 为空、_blank、任意字符串，一律在当前标签打开
            if (url) {
                window.location.href = url;
            }
            return null;
        };
    }

    // 处理表单
    function interceptForms() {
        document.addEventListener(
            'submit',
            (e) => {
                const form = e.target;
                if (form && form.target && form.target !== '_self') {
                    form.removeAttribute('target');
                    console.log('[Bilibili No New Tab] form target removed');
                }
            },
            true
        );
    }

    // 处理单页应用的“伪刷新”：URL 变动后再修一次链接
    function hookHistory() {
        const _pushState = history.pushState;
        const _replaceState = history.replaceState;

        function onUrlChange() {
            // 等 DOM 稍微渲染一下再修
            setTimeout(fixAllLinks, 300);
        }

        history.pushState = function () {
            const ret = _pushState.apply(this, arguments);
            onUrlChange();
            return ret;
        };
        history.replaceState = function () {
            const ret = _replaceState.apply(this, arguments);
            onUrlChange();
            return ret;
        };
        window.addEventListener('popstate', onUrlChange, true);
    }

    // 初始化
    fixAllLinks();
    observeLinks();
    interceptClicks();
    hookWindowOpen();
    interceptForms();
    hookHistory();

    console.log('✅ Bilibili No New Tab script loaded!');

})();
