// ==UserScript==
// @name        RYM Album Score Tracker
// @description Track and analyze album ratings from your friends on Rate Your Music.
// @namespace   aaantoni.github.io
// @match       *://*.rateyourmusic.com/release/*
// @version     1.1.0
// @author      Aaantoni (https://github.com/Aaantoni)
// @downloadURL https://Aaantoni.github.io/userscripts/rym_album_score_tracker.user.js
// @updateURL   https://Aaantoni.github.io/userscripts/rym_album_score_tracker.user.js
// @icon        https://icons.duckduckgo.com/ip3/rateyourmusic.com.ico
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_addStyle
// @grant       GM_addElement
// ==/UserScript==

(function() {
  "use strict";

  const users = GM_getValue("users", []); // [{ user: "username", ratings: [{ album: "albumShortcut", rating: 4.5 }] }]
  const albums = GM_getValue("albums", []); // [{ album: "albumShortcut", tag: "good" | "bad" }]

  const albumTitleEl = document.querySelector('.album_title');
  if (!albumTitleEl) {
    console.error('Album title element not found');
    return;
  }
  const albumShortcut = albumTitleEl.querySelector('.album_shortcut').value.replace(/[\]\[]/g, "");
  const albumArtist = document.querySelector('.artist[itemprop="name"]').innerText;
  const albumTitle =  document.querySelector('.release_page[itemprop="mainEntity"] > meta[itemprop="name"]').content;

  let newAlbum = true;

  const css = `#theWholeThing {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;

      .ui_button {
        display: block;
        width: 100%;
        margin: 0;
        &.hidden {
          display: none;
        }
      }

      #tagAlbumEl {
        display: flex;
        width: 100%;
        gap: 1rem;
        label {
          flex: 1;
        }
        input { position: absolute; width: 1px; height: 1px; margin: -1px; clip-path: inset(50%); overflow: hidden; white-space: pre; }
        #tagBadAlbum:checked + .ui_button {
          background-color: #ff0000;
        }
        #tagGoodAlbum:checked + .ui_button {
          background-color: #00ff00;
        }
        &:has(input:checked) .ui_button {
          background-color: #797979;
        }
      }

      .darkred_btn {
        margin-top: auto;
      }
    }
    
    .catalog_section {
      display: grid;
      grid-template-columns: 1fr 200px;
      grid-auto-flow: column;
      gap: 10px;
      margin-top: 5px;
      > * {
          position: relative;
          display: block;
          padding: 0;
      }
      #catalog_list {
          grid-column: 1;
          margin: 0;
      }
      .catalog_stats {
        display: flex;
        flex-direction: column;
      }
      #suspiciousUsersResults {
        grid-column: 1 / -1;
      }
    }`;

  GM_addStyle(css);

  const theWholeThingParentEl = document.querySelector('.catalog_section');
  const theWholeThingSidebarEl = theWholeThingParentEl.querySelector('.catalog_stats');

  const theWholeThing = GM_addElement(theWholeThingSidebarEl, 'div', { id: 'theWholeThing' });

  let album = albums.find(a => a.album === albumShortcut);

  const tagAlbumEl = GM_addElement(theWholeThing, 'div', { id: 'tagAlbumEl' });
  tagAlbumEl.innerHTML = `
    <label for="tagBadAlbum">
      <input type="radio" id="tagBadAlbum" value="bad" name="goodOrBad">
      <div class="ui_button">Bad</div>
    </label>
    <label for="tagGoodAlbum">
      <input type="radio" id="tagGoodAlbum" value="good" name="goodOrBad">
      <div class="ui_button">Good</div>
    </label>`;

  const logAlbumEl = GM_addElement(theWholeThing, 'button', { textContent: 'Log Album', class: 'ui_button hidden' });
  logAlbumEl.addEventListener('click', saveScores);

  const analyzeEl = GM_addElement(theWholeThing, 'button', { textContent: 'Analyze Ratings', class: 'ui_button' });
  analyzeEl.addEventListener('click', getScores);

  const listAlbumsEl = GM_addElement(theWholeThing, 'button', { textContent: 'List albums', class: 'ui_button' });
  listAlbumsEl.addEventListener('click', listAlbums);

  const removeAlbumEl = GM_addElement(theWholeThing, 'button', { textContent: 'Remove album', class: `ui_button darkred_btn ${newAlbum && 'hidden'}` });
  removeAlbumEl.addEventListener('click', removeAlbum);

  const tagAlbumInputs = tagAlbumEl.querySelectorAll('input[name="goodOrBad"]');

  // first, check if our album is already tagged
  if (album) {
    if (album.tag === 'bad') {
      tagAlbumInputs[0].checked = true;
    } else if (album.tag === 'good') {
      tagAlbumInputs[1].checked = true;
    }
    logAlbumEl.classList.remove('hidden');
    removeAlbumEl.classList.remove('hidden');
    newAlbum = false;
  }

  tagAlbumInputs.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (newAlbum) {
        albums.push({ album: albumShortcut, tag: null, artist: albumArtist, title: albumTitle });
        album = albums.find(a => a.album === albumShortcut);
        newAlbum = false;
      }
      logAlbumEl.classList.remove('hidden');
      const selectedTag = e.target.value;
      album.tag = selectedTag;
      GM_setValue("albums", albums);
    });
  });

  function saveScores() {
    const currentUsers = document.querySelectorAll('#catalog_list > .catalog_line > .catalog_header.friend');
    currentUsers.forEach((currentUser) => {
      const username = currentUser.querySelector('.catalog_user a.user').innerText;
      const rating = parseFloat(currentUser.querySelector('.catalog_rating img').alt);
      const existingUser = users.find((user) => user.user === username);
      if (existingUser) {
        const existingRating = existingUser.ratings.findIndex(a => a.album === albumShortcut);
        if (existingRating !== -1) {
          existingUser.ratings[existingRating].rating = rating;
        } else {
          existingUser.ratings.push({ album: albumShortcut, rating: rating });
        }
      } else {
        users.push({ user: username, ratings: [{ album: albumShortcut, rating: rating }] });
      }
    });
    GM_setValue("users", users);
    GM_setValue("albums", albums);
  }

  function getScores() {
    const suspiciousUsers = users
      .map(user => {
        const userRatings = user.ratings.map(rating => ({
          ...rating,
          tag: albums.find(a => a.album === rating.album)?.tag,
          title: albums.find(a => a.album === rating.album)?.title,
        }));

        const badAlbums = userRatings.filter(r => r.tag === 'bad');
        const goodAlbums = userRatings.filter(r => r.tag === 'good');
        const badAlbumsCount = badAlbums.length;
        const goodAlbumsCount = goodAlbums.length;

        if (badAlbumsCount === 0 && goodAlbumsCount === 0) return null;

        // Calculate averages
        const badAlbumsAvg = badAlbumsCount > 0 
          ? badAlbums.reduce((sum, album) => sum + album.rating, 0) / badAlbumsCount 
          : 0;

        const goodAlbumsAvg = goodAlbumsCount > 0 
          ? goodAlbums.reduce((sum, album) => sum + album.rating, 0) / goodAlbumsCount 
          : 0;

        // Calculate coverage percentages
        const totalBadAlbums = getAlbums('bad').length || 1; // avoid division by zero
        const totalGoodAlbums = getAlbums('good').length || 1;
        const badAlbumsPercentage = badAlbumsCount / totalBadAlbums;
        const goodAlbumsPercentage = goodAlbumsCount / totalGoodAlbums;

        // Base scores
        // For bad albums: Map 0.5→-100, 2.75→0, 5.0→+100
        let badAlbumsScore = 0;
        if (badAlbumsCount > 0) {
          badAlbumsScore = (badAlbumsAvg - 2.75) * (100 / 2.25);
        }

        // For good albums: Map 0.5→+100, 2.75→0, 5.0→-100
        let goodAlbumsScore = 0;
        if (goodAlbumsCount > 0) {
          goodAlbumsScore = (2.75 - goodAlbumsAvg) * (100 / 2.25);
        }

        // Enhanced weighting for extreme ratings
        // Count bad albums rated 4.0+
        const highRatedBadAlbums = badAlbums.filter(album => album.rating >= 4.0);
        const highRatedBadPercentage = badAlbumsCount > 0 ? highRatedBadAlbums.length / badAlbumsCount : 0;

        // Count good albums rated 2.0-
        const lowRatedGoodAlbums = goodAlbums.filter(album => album.rating <= 2.0);
        const lowRatedGoodPercentage = goodAlbumsCount > 0 ? lowRatedGoodAlbums.length / goodAlbumsCount : 0;

        // Apply coverage weights - more albums rated = more confident assessment
        const badCoverageWeight = Math.min(0.4 + (badAlbumsPercentage * 0.6), 1);
        const goodCoverageWeight = Math.min(0.3 + (goodAlbumsPercentage * 0.7), 1);

        // Weighted scores
        const badAlbumsWeighted = badAlbumsScore * badCoverageWeight;
        const goodAlbumsWeighted = goodAlbumsScore * goodCoverageWeight;

        // Bonus points for extreme rating patterns
        const highRatingBonus = highRatedBadPercentage > 0 
          ? 30 * highRatedBadPercentage * (1 + badAlbumsPercentage)
          : 0;

        const lowRatingBonus = lowRatedGoodPercentage > 0
          ? 30 * lowRatedGoodPercentage * (1 + goodAlbumsPercentage)
          : 0;

        // Combined score
        const rawScore = badAlbumsWeighted + goodAlbumsWeighted + highRatingBonus + lowRatingBonus;

        // Final suspicion score (only positive values)
        const suspicionScore = Math.max(0, rawScore);

        // Prepare info for display
        const highRatedBadCount = highRatedBadAlbums.length;
        const lowRatedGoodCount = lowRatedGoodAlbums.length;

        return {
          user: user.user,
          suspicionScore,
          badAlbums,
          badAlbumsAvg,
          badAlbumsPercentage,
          badAlbumsCount,
          goodAlbumsAvg,
          goodAlbums,
          goodAlbumsPercentage,
          goodAlbumsCount,
          highRatedBadCount,
          lowRatedGoodCount,
          // Add detailed breakdown for the UI
          scoreDetails: {
            badAlbumsBaseScore: badAlbumsScore.toFixed(1),
            goodAlbumsBaseScore: goodAlbumsScore.toFixed(1),
            badAlbumsWeighted: badAlbumsWeighted.toFixed(1),
            goodAlbumsWeighted: goodAlbumsWeighted.toFixed(1),
            highRatingBonus: highRatingBonus.toFixed(1),
            lowRatingBonus: lowRatingBonus.toFixed(1)
          }
        };
      })
      .filter(user => user && user.suspicionScore > 0)
      .sort((a, b) => b.suspicionScore - a.suspicionScore);

    // Remove existing results if any
    const existingResults = document.querySelector('#suspiciousUsersResults');
    if (existingResults) existingResults.remove();

    // Create results display
    const resultsDiv = GM_addElement(theWholeThingParentEl, 'div', { id: 'suspiciousUsersResults' });
    resultsDiv.style = "margin-top: 1rem; padding: 1rem; border: 1px solid black; border-radius: 4px;";

    if (suspiciousUsers.length === 0) {
      resultsDiv.innerHTML = '<p>No suspicious rating patterns found.</p>';
    } else {
      const html = suspiciousUsers.map(user => {
        return `
          <div style="margin-bottom: 1rem; padding: 0.5rem; border-left: 4px solid ${getSuspicionColor(user.suspicionScore)}">
            <div class="suspiciousUserHeader" style="cursor: pointer">
              <strong>${user.user}</strong> (Suspicion: ${user.suspicionScore.toFixed(1)})<br>
              Bad albums avg: ${user.badAlbumsAvg.toFixed(2)} (${user.badAlbumsCount} albums)<br>
              Good albums avg: ${user.goodAlbumsCount ? user.goodAlbumsAvg.toFixed(2) : 'No ratings'} (${user.goodAlbumsCount} albums)
            </div>
            <div style="display:none;padding-left:.5rem">
              <a href="/~${user.user}" target="_blank" class="btn blue_btn btn_small" style="margin-top:.5rem;margin-left:-.5rem;">${user.user}</a><br>
              <div style="margin-top:.5rem">
                <strong>Points breakdown:</strong><br>
                Base score for bad albums: ${user.scoreDetails.badAlbumsBaseScore}<br>
                Base score for good albums: ${user.scoreDetails.goodAlbumsBaseScore}<br>
                Weighted bad albums score: ${user.scoreDetails.badAlbumsWeighted}<br>
                Weighted good albums score: ${user.scoreDetails.goodAlbumsWeighted}<br>
                Bonus for high rated bad albums: ${user.scoreDetails.highRatingBonus}<br>
                Bonus for low rated good albums: ${user.scoreDetails.lowRatingBonus}<br>
              </div>
              <div style="margin-top:.5rem">
                <strong>Album breakdown:</strong><br>
                ${user.badAlbums.map(album => {
                  return `
                    <div style="margin-left: 1rem; padding: 0.5rem; border-left: 4px solid #ff0000">
                      <strong>${album.title}</strong> (${album.rating})
                    </div>
                  `;
                }).join('')}
                ${user.goodAlbums.map(album => {
                  return `
                    <div style="margin-left: calc(1rem - 1px); padding: calc(0.5rem - 1px); border-left: 6px solid #00ff00">
                      <strong>${album.title}</strong> (${album.rating})
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('');

      resultsDiv.innerHTML = `
        <p>Found ${suspiciousUsers.length} suspicious users:</p>
        ${html}
      `;

      const suspiciousUserHeaders = resultsDiv.querySelectorAll('.suspiciousUserHeader');
      suspiciousUserHeaders.forEach(header => {
        header.addEventListener('click', () => {
          const details = header.nextElementSibling;
          details.style.display = details.style.display === 'none' ? 'block' : 'none';
        });
      });
    }
  }

  function getSuspicionColor(score) {
    if (score >= 100) return '#ff0000';     // Pure red for extreme cases
    if (score >= 90) return '#e62a00';      // Very suspicious
    if (score >= 80) return '#cc5500';      // Quite suspicious
    if (score >= 70) return '#b38000';      // Moderately suspicious
    if (score >= 60) return '#999a00';      // Mildly suspicious
    return '#80ff00';                       // Not suspicious
  }

  function getAlbums(tag = null) {
    if (!tag) return albums.map(a => a.album);
    return albums.filter(a => a.tag === tag).map(a => a.album);
  }

  function listAlbums() {
    // Remove existing results if any
    const existingResults = document.querySelector('#suspiciousUsersResults');
    if (existingResults) existingResults.remove();

    // Create results display
    const resultsDiv = GM_addElement(theWholeThingParentEl, 'div', { id: 'suspiciousUsersResults' });
    resultsDiv.style = "padding: 10px;";

    // List all tracked albums
    if (albums.length === 0) {
      resultsDiv.innerHTML = '<p>No albums tracked.</p>';
    } else {
      console.log(albums);
      const html = albums.map(album => {
        return `
          <div style="margin-bottom: 1rem; padding: 0.5rem; border-left: 4px solid ${album.tag ? (album.tag === 'bad' ? '#ff0000' : '#00ff00') : '#797979'}">
            <strong>${album.title}</strong><br>
            ${album.artist}
          </div>
        `;
      }).join('');

      resultsDiv.innerHTML = `
        <p>Tracked albums:</p>
        ${html}
      `;
    }
  }

  function removeAlbum() {
    // 1) Find & remove from albums
    const albumIndex = albums.findIndex(a => a.album === albumShortcut);
    if (albumIndex === -1) {
      alert('Album not found!');
      return;
    }
    albums.splice(albumIndex, 1);
  
    // 2) Remove that album from every user’s ratings
    users.forEach(user => {
      const idx = user.ratings.findIndex(r => r.album === albumShortcut);
      if (idx !== -1) user.ratings.splice(idx, 1);
    });
  
    // 3) Persist both arrays
    GM_setValue("albums", albums);
    GM_setValue("users", users);
  
    alert('Album removed successfully!');
    location.reload();
  }
})();