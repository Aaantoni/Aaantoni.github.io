// ==UserScript==
// @name        RYM Descriptor Map
// @namespace   aaantoni.github.io
// @match       *://*.rateyourmusic.com/release/*
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addValueChangeListener
// @grant       GM_addElement
// @version     1.0
// @author      @Aaantoni (https://github.com/Aaantoni)
// @description A script to find common descriptors in RYM album pages.
// @icon        https://icons.duckduckgo.com/ip3/rateyourmusic.com.ico
// @homepageURL https://aaantoni.github.io
// @downloadURL https://aaantoni.github.io/userscripts/rym_descriptormap.user.js
// @updateURL   https://aaantoni.github.io/userscripts/rym_descriptormap.user.js
// ==/UserScript==

(function() {
    'use strict';

    const tableAlbumInfo = document.querySelector("table.album_info > tbody");

    if (tableAlbumInfo) {
        let existingArrays = GM_getValue("arrays", []);

        const commonElementsRow = GM_addElement(tableAlbumInfo, "tr", { class: "release_descriptors", id: "commonElementsDiv", hidden: '' });
        commonElementsRow.innerHTML = `<th class="info_hdr">Common Descriptors</th><td class="release_pri_descriptors" id="commonElements"></td><td id="deleteArrays" style="padding:0;text-align:center"><a href="#" class="genre_descriptor_vote_btn" title="Remove descriptor arrays"><i class="fa fa-times"></i></a></td>`;
        const commonElementsDiv = tableAlbumInfo.querySelector("#commonElements");

        updateDescriptorDisplay(existingArrays, commonElementsDiv);
        GM_addValueChangeListener("arrays",
            (name, oldValue, newValue, remote) => {
                existingArrays = newValue || [];
                updateDescriptorDisplay(existingArrays, commonElementsDiv);
            }
        );

        const descriptorsLabel = tableAlbumInfo.querySelector("tr.release_descriptors > th.info_hdr");
        descriptorsLabel.addEventListener("click", saveDescriptors);
        descriptorsLabel.style.cursor = "pointer";

        const deleteArraysButton = commonElementsRow.querySelector("#deleteArrays a");
        deleteArraysButton.addEventListener("click", function(e) {
            e.preventDefault();
            GM_setValue("arrays", []);
        });

        function saveDescriptors() {
            const descriptors = tableAlbumInfo.querySelectorAll("tr.release_descriptors meta");
            const descriptorArray = Array.from(descriptors).map(d => d.getAttribute("content").trim());
            existingArrays.push(descriptorArray);
            GM_setValue("arrays", existingArrays);
        }

        function updateDescriptorDisplay(arrays, div) {
            if (arrays.length > 0) {
                const newCommonElements = getCommonElements(arrays);
                commonElementsRow.removeAttribute("hidden");
                if (newCommonElements.length === 0) {
                    div.innerHTML = `No common descriptors`;
                } else {
                    div.innerHTML = newCommonElements.join(", ");
                }
            } else {
                div.innerHTML = '';
                commonElementsRow.setAttribute("hidden", '');
            }
        }
    }

    function getCommonElements(arrays) {
        // Find intersection
        let common = new Set(arrays[0]);
        for (let arr of arrays.slice(1)) {
            common = new Set([...common].filter(x => arr.includes(x)));
        }
        if (common.size === 0) return [];

        // Build weight map
        const weight = {};
        common.forEach(item => { weight[item] = 0; });
        for (let arr of arrays) {
            const len = arr.length;
            arr.forEach((item, idx) => {
            if (common.has(item)) weight[item] += idx / len;
            });
        }

        // Sort by cumulative weight (lower = appeared earlier on average)
        return [...common].sort((a, b) => weight[a] - weight[b]);
    }
})();