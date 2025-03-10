// ==UserScript==
// @name        Fix meta-title of RYM charts
// @description Fixes the meta-title of RYM charts to include the artists/genres/descriptors in the chart
// @namespace   aaantoni.github.io
// @match       *://*.rateyourmusic.com/charts/*
// @grant       none
// @version     1.0
// @author      Aaantoni (https://github.com/Aaantoni)
// @icon        https://icons.duckduckgo.com/ip3/rateyourmusic.com.ico
// @homepageURL https://Aaantoni.github.io
// @downloadURL https://Aaantoni.github.io/userscripts/rym_chart_title.user.js
// @updateURL   https://Aaantoni.github.io/userscripts/rym_chart_title.user.js
// ==/UserScript==

(function () {
    "use strict";

    if (RYMchart && RYMchart.state) {
        let newtitle = `Charts: ${RYMchart.state.chart_type_label}`;

        if (RYMchart.state.artist_include.length > 0) {
            newtitle += ` ${RYMchart.state.chart_object_label.replace(' (all)', '')} by ${RYMchart.state.artist_include.map(artist => artist.name).join(', ')}`;
        } else if (RYMchart.state.genre_include.length > 0 || RYMchart.state.sec_genre_include.length > 0 || RYMchart.state.genre_either_include.length > 0 || RYMchart.state.descriptor_include.length > 0) {
            let includedGenres = RYMchart.state.genre_include.map(genre => genre.name);
            let secGenres = RYMchart.state.sec_genre_include.map(genre => genre.name);
            let either = RYMchart.state.genre_either_include.map(genre => genre.name);
            let allGenres = [...includedGenres, ...secGenres, ...either].filter(Boolean);

            let descriptors = RYMchart.state.descriptor_include.map(descriptor => descriptor.name);

            if (descriptors.length > 0) newtitle += ` ${descriptors.join(', ')}`;
            if (allGenres.length > 0) newtitle += ` ${allGenres.join(', ')}`;
            newtitle += ` ${RYMchart.state.chart_object_label.replace(' (all)', '')}`;
        } else {
            newtitle += ` ${RYMchart.state.chart_object_label.replace(' (all)', '')}`;
        }

        document.title = newtitle + ' of ' + RYMchart.state.date_display.replace('All-time', 'all time') + ' - Rate Your Music';
    }
})();
