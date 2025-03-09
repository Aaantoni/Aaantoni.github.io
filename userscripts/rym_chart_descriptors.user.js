// ==UserScript==
// @name        Filter RYM charts by descriptors
// @description Filter RYM charts based on selected descriptors, hiding mismatched items
// @namespace   aaantoni.github.io
// @match       *://*.rateyourmusic.com/charts/*
// @grant       none
// @version     1.0
// @author      Aaantoni (https://github.com/Aaantoni)
// @icon        https://icons.duckduckgo.com/ip3/rateyourmusic.com.ico
// @homepageURL https://Aaantoni.github.io
// @downloadURL https://Aaantoni.github.io/userscripts/rym_chart_descriptors.user.js
// @updateURL   https://Aaantoni.github.io/userscripts/rym_chart_descriptors.user.js
// ==/UserScript==

(function() {
    'use strict';

    function hasEnoughCommonElements(smol, lorg, amnt) {
        const commonElements = smol.filter(item => lorg.includes(item));
        return commonElements.length >= amnt;
    }

    function filterDescriptors(descriptorsArray, resultsArray, amnt) {
        resultsArray.forEach((result) => {
            result.classList.remove("filter_descriptor_match");
            result.classList.remove("filter_descriptor_mismatch");
            const resultDescriptors = Array.from(result.querySelectorAll(".page_charts_section_charts_item_genre_descriptors .comma_separated")).map(element => element.innerText.trim());
            if (hasEnoughCommonElements(descriptorsArray, resultDescriptors, amnt)) {
                result.classList.add("filter_descriptor_match");
            } else {
                result.classList.add("filter_descriptor_mismatch");
            }
        });
    }

    const chartDescriptorsWrapper = document.querySelector("#page_chart_query_free_section_descriptor_include.has_items");
    if (chartDescriptorsWrapper) {
        const chartDescriptorsParent = chartDescriptorsWrapper.querySelector("#page_chart_query_free_section_items_descriptor_include");

        const blacklist = ['male vocalist', 'female vocalist', 'non-binary vocalist', 'androgynous vocals'];
        let chartDescriptors = Array.from(chartDescriptorsParent.querySelectorAll(".page_chart_query_item_type_selector .page_chart_query_item_title")).map(element => element.innerText.trim()).filter(item => !blacklist.includes(item));

        if (chartDescriptors.length) {
            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync("#page_charts_section_charts.filter_descriptors_on .filter_descriptor_mismatch { display: none; }");
            document.adoptedStyleSheets.push(styleSheet);

            const chartResultsWrapper = document.querySelector("#page_charts_section_charts");
            let chartResults = chartResultsWrapper.querySelectorAll(".page_section_charts_item_wrapper");
            chartResultsWrapper.classList.add("filter_descriptors_on");

            const filterDiv = document.createElement("div");
            filterDiv.id = "filter_descriptors";

            let filterInput = document.createElement("input");
            filterInput.id = "filter_descriptors_range";
            filterInput.type = "range";
            filterInput.setAttribute("value", 0);
            filterInput.max = chartDescriptors.length;

            filterDiv.append(filterInput);
            chartDescriptorsWrapper.append(filterDiv);
            filterInput = document.querySelector("#filter_descriptors_range");

            filterInput.addEventListener("input", (() => {
                filterDescriptors(chartDescriptors, chartResults, filterInput.value);
            }));

            const observerResults = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    chartResults = mutation.target.querySelectorAll(".page_section_charts_item_wrapper");
                    filterDescriptors(chartDescriptors, chartResults, filterInput.value);
                }
            });
            observerResults.observe(chartResultsWrapper, { childList: true });

            const observerDescriptors = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    chartDescriptors = Array.from(mutation.target.querySelectorAll(".page_chart_query_item_type_selector .page_chart_query_item_title")).map(element => element.innerText.trim()).filter(item => !blacklist.includes(item));
                    filterInput.max = chartDescriptors.length;
                    filterDescriptors(chartDescriptors, chartResults, filterInput.value);
                }
            });
            observerDescriptors.observe(chartDescriptorsParent, { childList: true });
        }
    }

})();
