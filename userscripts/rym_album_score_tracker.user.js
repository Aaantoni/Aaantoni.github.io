// ==UserScript==
// @name        RYM Album Score Tracker
// @description Tracks users and their scores for albums on RYM. It allows you to mark albums as good or bad and saves the scores for each user. The script also provides a button to delete all saved users and their scores.
// @namespace   aaantoni.github.io
// @match       *://*.rateyourmusic.com/release/*
// @version     1.0.1
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

  const albumShortcutEl = document.querySelector('.album_title input.album_shortcut');
  if (!albumShortcutEl) {
    console.error('Album shortcut element not found');
    return;
  }
  const albumShortcut = albumShortcutEl.value.replace(/[\]\[]/g, "");
  let album = albums.find(a => a.album === albumShortcut);

  const css = `#theWholeThing {
    margin-top: 1rem;
    display: grid;
    gap: 1rem;
    place-items: center;

    .ui_button {
      display: block;
      width: 100%;
    }

    #tagAlbumEl {
      display: flex;
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
    }
  }`;

  GM_addStyle(css);

  const theWholeThingParentEl = document.querySelector('.catalog_section');
  const theWholeThingSidebarEl = theWholeThingParentEl.querySelector('.catalog_stats');

  const theWholeThing = GM_addElement(theWholeThingSidebarEl, 'div', { id: 'theWholeThing' });

  const startButtonEl = GM_addElement(theWholeThing, 'button', { textContent: 'Start', class: 'ui_button' });

  album && startButtonEl.click();

  startButtonEl.addEventListener('click', () => {

    startButtonEl.remove();

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

    const tagAlbumInputs = tagAlbumEl.querySelectorAll('input[name="goodOrBad"]');

    // first, check if our album is already tagged
    if (album) {
      if (album.tag === 'bad') {
        tagAlbumInputs[0].checked = true;
      } else if (album.tag === 'good') {
        tagAlbumInputs[1].checked = true;
      }
    } else {
      albums.push({ album: albumShortcut, tag: null });
      album = albums.find(a => a.album === albumShortcut);
    }

    tagAlbumInputs.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const selectedTag = e.target.value;
        album.tag = selectedTag;
        GM_setValue("albums", albums);
      });
    });

    const logAlbumEl = GM_addElement(theWholeThing, 'button', { textContent: 'Log Album', class: 'ui_button' });
    logAlbumEl.addEventListener('click', saveScores);

    const deleteUsersEl = GM_addElement(theWholeThing, 'button', { textContent: 'Delete', class: 'ui_button' });
    deleteUsersEl.onload = () => console.log('loaded', deleteUsersEl);
    deleteUsersEl.addEventListener('click', () => { GM_deleteValue("users") });

    const analyzeEl = GM_addElement(theWholeThing, 'button', { textContent: 'Analyze Ratings', class: 'ui_button' });
    analyzeEl.onload = () => console.log('loaded', analyzeEl);
    analyzeEl.addEventListener('click', getScores);

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
          // Separate albums into good and bad based on their tags
          const userRatings = user.ratings.map(rating => ({
            ...rating,
            tag: albums.find(a => a.album === rating.album)?.tag
          }));

          const badAlbums = userRatings.filter(r => r.tag === 'bad');
          const goodAlbums = userRatings.filter(r => r.tag === 'good');

          // Skip users who haven't rated any tagged albums
          if (badAlbums.length === 0) return null;

          const badAlbumsAvg = badAlbums.reduce((sum, album) => sum + album.rating, 0) / badAlbums.length;
          const goodAlbumsAvg = goodAlbums.length ?
            goodAlbums.reduce((sum, album) => sum + album.rating, 0) / goodAlbums.length :
            0;

          const suspicionScore =
            (badAlbumsAvg >= 4.0 ? badAlbumsAvg * 3 : badAlbumsAvg * 1.5) +
            (goodAlbums.length === 0 ? 12 : (12 - (goodAlbumsAvg * 3))) +
            (Math.min(badAlbums.length, 10) * 0.10);

          return {
            user: user.user,
            badAlbumsAvg,
            goodAlbumsAvg,
            badCount: badAlbums.length,
            goodCount: goodAlbums.length,
            suspicionScore
          };
        })
        .filter(user => user && user.suspicionScore > 4)
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
              <strong>${user.user}</strong> (Suspicion: ${user.suspicionScore.toFixed(1)})<br>
              Bad albums avg: ${user.badAlbumsAvg.toFixed(2)} (${user.badCount} albums)<br>
              Good albums avg: ${user.goodAlbumsAvg ? user.goodAlbumsAvg.toFixed(2) : 'No ratings'} (${user.goodCount} albums)
            </div>
          `;
        }).join('');

        resultsDiv.innerHTML = `
          <p>Found ${suspiciousUsers.length} suspicious users:</p>
          ${html}
        `;
      }
    }

    // Helper function to get color based on suspicion score
    function getSuspicionColor(score) {
      if (score >= 20) return '#ff0000';      // Pure red for extreme cases
      if (score >= 15) return '#ff2222';      // Very suspicious
      if (score >= 10) return '#ff6644';      // Quite suspicious
      if (score >= 7) return '#ff8844';       // Moderately suspicious
      return '#ffbb44';                       // Mildly suspicious
    }
  }, { once: true });
})();
