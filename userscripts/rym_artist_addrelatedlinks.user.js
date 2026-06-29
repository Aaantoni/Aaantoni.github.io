// ==UserScript==
// @name        RYM Artist Charts Links
// @description Add artist and related artists charts links to RYM artist pages
// @namespace   aaantoni.github.io
// @match       *://*rateyourmusic.com/artist/*
// @grant       none
// @version     1.0
// @author      @Aaantoni (https://github.com/Aaantoni)
// @icon        https://icons.duckduckgo.com/ip3/rateyourmusic.com.ico
// @homepageURL https://aaantoni.github.io
// @downloadURL https://aaantoni.github.io/userscripts/rym_artist_addrelatedlinks.user.js
// @updateURL   https://aaantoni.github.io/userscripts/rym_artist_addrelatedlinks.user.js
// ==/UserScript==

(function () {
    "use strict";

    const artistUrlMeta = document.querySelector(".artist_page.scope_music[itemscope][itemtype='http://schema.org/MusicGroup'] > meta[itemprop='url']");

    if (artistUrlMeta) {

        const artistUrl = artistUrlMeta.content;

        if (artistUrl.match(/\/artist\/([^\/]+)\/?$/)) {

            const artistSlug = artistUrl.match(/\/artist\/([^\/]+)\/?$/)[1];

            const artistChartsHref = `/charts/top/album,ep,comp,unauth,mixtape,djmix,additional/all-time/a:${artistSlug}/deweight:live,archival,soundtrack/pop:4/`;

            const artistChartsLink = document.createElement("a");
            artistChartsLink.href = artistChartsHref;
            artistChartsLink.innerText = "View artist charts";
            artistChartsLink.className = "btn blue_btn";

            const relatedArtists = [];

            const artistInfoHeaders = Array.from(document.querySelectorAll(".info_hdr")).filter(el => ["Also Known As", "Related Artists", "Member of", "Members"].includes(el.innerText));
            artistInfoHeaders.forEach(header => {
                const infoContainer = header.nextElementSibling;
                if (infoContainer) {
                    const artistUrls = Array.from(infoContainer.querySelectorAll("a")).map(a => a.href);
                    const artistSlugs = artistUrls.map(url => url.match(/\/artist\/([^\/]+)\/?$/)[1]);
                    relatedArtists.push(...artistSlugs);
                }
            });

            const relatedArtistsChartsHref = `/charts/top/album,ep,comp,unauth,mixtape,djmix,additional/all-time/a:${artistSlug},${relatedArtists.join(",")}/deweight:live,archival,soundtrack/pop:4/`;

            const relatedArtistsChartsLink = document.createElement("a");
            relatedArtistsChartsLink.href = relatedArtistsChartsHref;
            relatedArtistsChartsLink.innerText = "View related artists charts";
            relatedArtistsChartsLink.className = "btn blue_btn";

            const shareHeader = Array.from(document.querySelectorAll(".info_hdr")).find(el => el.innerText === "Share");

            const shareContainer = shareHeader && shareHeader.nextElementSibling;
            if (shareContainer) {
                shareContainer.appendChild(artistChartsLink);
                shareContainer.appendChild(relatedArtistsChartsLink);
                shareContainer.style = "";
                shareHeader.remove();
            }

        }
    }

})();