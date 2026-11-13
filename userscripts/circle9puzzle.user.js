// ==UserScript==
// @name        circle9puzzle.com
// @description Circle Nine puzzle helpers
// @author      Aaantoni
// @namespace   https://aaantoni.github.io
// @homepageURL https://aaantoni.github.io
// @downloadURL https://aaantoni.github.io/userscripts/circle9puzzle.user.js
// @icon        https://www.google.com/s2/favicons?domain=circle9puzzle.com&sz=64
// @match       https://circle9puzzle.com/*
// @tag         circle9puzzle.com
// @version     0.6
// @grant       none
// ==/UserScript==

(function() {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    function watchPuzzle(sync, overlay, options) {
        let scheduled = false;
        const observer = new MutationObserver(mutations => {
            if (scheduled || mutations.every(mutation => overlay.contains(mutation.target))) { return; }
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                sync();
            });
        });
        sync();
        observer.observe(document.body, options);
    }

    function initCircleNine() {
        const OVERLAY_ID = "c9h-overlay";
        const BAR_ID = "c9h-bar";
        const WRAP_ID = "c9h-wrap";

        // Same hue families as the original palette, but spread across lightness so
        // neighbouring numbers stay distinguishable with red-green / blue-yellow
        // deficiencies (lightness differences survive all of them).
        const BG = {
            1: "#c62828", // red, dark
            2: "#ffa44d", // orange, light-mid
            3: "#fff275", // yellow, very light
            4: "#17b8e0", // cyan, mid
            5: "#7f9cff", // periwinkle blue, mid
            6: "#2fa86a", // green, mid-dark
            7: "#0b5d66", // teal, very dark
            8: "#d5dedc", // pale grey-teal, very light
            9: "#222222", // near black
        };
        const FG = { 1: "white", 2: "black", 3: "black", 4: "black", 5: "black", 6: "black", 7: "white", 8: "black", 9: "white" };

        const vars = Object.keys(BG).map(n =>
            `--theme-circle9-color-${n}: ${BG[n]};--theme-circle9-color-text-${n}: ${FG[n]};`).join("");

        const style = document.createElement("style");
        style.textContent = `
    html:root:root { ${vars} }
    #${WRAP_ID} {
        display: flex; flex-direction: column; align-items: center;
        gap: 1em; align-self: stretch; min-width: 0;
    }
    #${BAR_ID} {
        display: flex; justify-content: center; gap: 6px; margin-top: 0.5em;
        font-family: sans-serif; user-select: none; box-sizing: border-box;
    }
    #${BAR_ID} button {
        width: 40px; height: 40px; padding: 0; margin: 0; border-radius: 50%;
        border: 2px solid transparent; font: bold 18px sans-serif; cursor: pointer;
        background: var(--c9h-bg); color: var(--c9h-fg); text-box: trim-both cap alphabetic;
    }
    #${BAR_ID} button:hover { border-color: rgba(0,0,0,0.6); }
    #${BAR_ID} button[aria-pressed="true"] {
        border-color: #fff; box-shadow: 0 0 0 2px #000;
    }
    `;
        document.head.appendChild(style);

        const highlighted = new Set();
        const buttons = new Map();

        // Visual-only overlay inside the puzzle svg; pointer-events: none keeps it
        // invisible to the puzzle's click/drag handling (which uses elementFromPoint).
        const overlay = document.createElementNS(SVG_NS, "g");
        overlay.id = OVERLAY_ID;
        overlay.style.pointerEvents = "none";
        let renderedKey = "";

        function findPuzzleSvg() {
            return document.querySelector(
                `.puzzle-and-dialog > div > svg.shrinkable-svg, .puzzle-and-dialog > div > #${WRAP_ID} > svg.shrinkable-svg`);
        }

        function sync() {
            const svg = findPuzzleSvg();
            if (!svg) { return; }
            placeBar(svg);
            if (overlay.parentNode !== svg || svg.lastElementChild !== overlay) {
                svg.appendChild(overlay);
                renderedKey = "";
            }
            const digits = highlighted;
            const cells = [];
            if (digits.size > 0) {
                // Cells already resolved: circled (the puzzle shows a circle) or eliminated (dimmed number)
                const circled = new Set();
                for (const c of svg.querySelectorAll("circle")) {
                    if (!overlay.contains(c) && getComputedStyle(c).display !== "none") {
                        circled.add(c.getAttribute("cx") + "," + c.getAttribute("cy"));
                    }
                }
                for (const t of svg.querySelectorAll("text")) {
                    const n = Number(t.textContent);
                    if (t.textContent.length !== 1 || !digits.has(n)) { continue; }
                    const x = t.getAttribute("x"), y = t.getAttribute("y");
                    const eliminated = parseFloat(getComputedStyle(t).opacity) < 0.5; // page dims eliminated numbers to 20%
                    if (circled.has(x + "," + y) || eliminated) { continue; }
                    cells.push([Number(x), Number(y), n]);
                }
            }
            const key = [...digits].sort().join("") + ":" + cells.join(";");
            if (key === renderedKey) { return; }
            renderedKey = key;
            overlay.textContent = "";
            const radius = 24;
            const add = (cx, cy, attrs) => {
                const c = document.createElementNS(SVG_NS, "circle");
                c.setAttribute("cx", cx);
                c.setAttribute("cy", cy);
                c.setAttribute("r", radius);
                for (const k in attrs) { c.setAttribute(k, attrs[k]); }
                overlay.appendChild(c);
            };
            for (const [cx, cy, n] of cells) {
                // Faint tint of the number's colour, plus a very light ring so it
                // still shows on a cell of the same colour
                add(cx, cy, { fill: BG[n], "fill-opacity": "0.35", stroke: "none" });
                add(cx, cy, { fill: "none", stroke: "#000", "stroke-width": 1, "stroke-opacity": "0.3" });
            }
        }

        function buildBar() {
            const bar = document.createElement("div");
            bar.id = BAR_ID;
            bar.setAttribute("role", "group");
            bar.setAttribute("aria-label", "Highlight number");
            for (let n = 1; n <= 9; ++n) {
                const b = document.createElement("button");
                b.type = "button";
                b.textContent = String(n);
                b.title = `Toggle highlight for ${n}`;
                b.style.setProperty("--c9h-bg", `var(--theme-circle9-color-${n})`);
                b.style.setProperty("--c9h-fg", `var(--theme-circle9-color-text-${n})`);
                b.setAttribute("aria-pressed", "false");
                b.addEventListener("mousedown", e => e.preventDefault()); // don't steal focus
                b.addEventListener("click", () => {
                    if (!highlighted.delete(n)) { highlighted.add(n); }
                    b.setAttribute("aria-pressed", String(highlighted.has(n)));
                    sync();
                });
                buttons.set(n, b);
                bar.appendChild(b);
            }
            return bar;
        }

        const bar = buildBar();
        document.addEventListener("keydown", event => {
            if (event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
                (event.target instanceof Element &&
                    event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))) {
                return;
            }
            const number = Number(event.key);
            if (number >= 1 && number <= 9 && Number.isInteger(number)) {
                buttons.get(number).click();
            }
        });
        const wrap = document.createElement("div");
        wrap.id = WRAP_ID;

        // The page's vdom patches children by index, so the bar can't be inserted
        // as a sibling of the svg. Instead the svg is wrapped together with the bar;
        // the wrapper takes the svg's slot and is rebuilt if the svg gets replaced.
        function placeBar(svg) {
            if (svg.parentElement === wrap && bar.parentElement === wrap) { return; }
            wrap.replaceChildren();
            svg.replaceWith(wrap);
            wrap.append(svg, bar);
        }

        watchPuzzle(sync, overlay, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    }

    function initCircleSum() {
        const overlay = document.createElementNS(SVG_NS, "g");
        overlay.id = "circlesum-totals";
        overlay.style.pointerEvents = "none";
        overlay.setAttribute("fill", "var(--theme-text)");
        overlay.setAttribute("font-size", "18");
        overlay.setAttribute("font-family", "sans-serif");
        overlay.setAttribute("text-anchor", "middle");
        overlay.setAttribute("dominant-baseline", "central");
        const expandedSvgs = new WeakSet();

        function readTotals(svg) {
            const circles = svg.querySelector("g > circle");
            const numbers = circles && circles.parentElement.nextElementSibling;
            if (!numbers || !numbers.matches("g")) {
                throw new Error("Cannot find the Circle Sum grid numbers.");
            }

            const cells = Array.from(numbers.children);
            const xs = [...new Set(cells.map(cell => Number(cell.getAttribute("x"))))].sort((a, b) => a - b);
            const ys = [...new Set(cells.map(cell => Number(cell.getAttribute("y"))))].sort((a, b) => a - b);
            if (!cells.length || cells.length !== xs.length * ys.length ||
                cells.length !== circles.parentElement.children.length) {
                throw new Error("Unexpected Circle Sum grid size.");
            }
            const rows = new Array(ys.length).fill(0);
            const columns = new Array(xs.length).fill(0);
            const positions = new Set();
            for (const cell of cells) {
                const x = cell.getAttribute("x");
                const y = cell.getAttribute("y");
                const value = cell.textContent.trim();
                const position = `${x},${y}`;
                if (cell.localName !== "text" || x === null || y === null ||
                    !Number.isFinite(Number(x)) || !Number.isFinite(Number(y)) ||
                    !/^-?\d+$/.test(value) || positions.has(position)) {
                    throw new Error("Unexpected Circle Sum grid cell.");
                }
                positions.add(position);
                rows[ys.indexOf(Number(y))] += Number(value);
                columns[xs.indexOf(Number(x))] += Number(value);
            }
            const gridCell = svg.querySelector("g.no-browser-stuff > rect");
            const cellWidth = gridCell && Number(gridCell.getAttribute("width")) - 1;
            const cellHeight = gridCell && Number(gridCell.getAttribute("height")) - 1;
            if (!(cellWidth > 0) || !(cellHeight > 0)) {
                throw new Error("Cannot determine the Circle Sum cell size.");
            }
            return { rows, columns, xs, ys, cellWidth, cellHeight };
        }

        let displayedSvg;
        let displayedValues = "";
        let failedSvg;

        function expandSvg(svg, cellWidth, cellHeight) {
            if (expandedSvgs.has(svg)) { return; }
            const viewBox = svg.getAttribute("viewBox").trim().split(/\s+/).map(Number);
            const width = Number(svg.getAttribute("width"));
            const height = Number(svg.getAttribute("height"));
            if (viewBox.length !== 4 || viewBox.some(value => !Number.isFinite(value)) ||
                !(viewBox[2] > 0) || !(viewBox[3] > 0) || !(width > 0) || !(height > 0)) {
                throw new Error("Cannot determine the Circle Sum SVG dimensions.");
            }
            const newWidth = width * (viewBox[2] + cellWidth) / viewBox[2];
            const newHeight = height * (viewBox[3] + cellHeight) / viewBox[3];
            svg.setAttribute("viewBox", `${viewBox[0]} ${viewBox[1]} ${viewBox[2] + cellWidth} ${viewBox[3] + cellHeight}`);
            svg.setAttribute("width", newWidth);
            svg.setAttribute("height", newHeight);
            svg.style.minWidth = `${newWidth * 0.5}px`;
            svg.style.minHeight = `${newHeight * 0.5}px`;
            svg.style.maxWidth = `${newWidth}px`;
            svg.style.maxHeight = `${newHeight}px`;
            expandedSvgs.add(svg);
        }

        function sync() {
            const svg = document.querySelector(".puzzle-and-dialog > div > svg.shrinkable-svg");
            if (!svg) { return; }

            let totals;
            try {
                totals = readTotals(svg);
                expandSvg(svg, totals.cellWidth, totals.cellHeight);
            } catch (error) {
                overlay.remove();
                displayedSvg = undefined;
                displayedValues = "";
                if (failedSvg !== svg) {
                    console.error("Circle Sum totals could not be calculated:", error);
                    failedSvg = svg;
                }
                return;
            }
            failedSvg = undefined;
            const values = JSON.stringify(totals);
            if (svg !== displayedSvg || values !== displayedValues || overlay.parentNode !== svg) {
                overlay.replaceChildren();
                const addTotal = (x, y, value, label) => {
                    const text = document.createElementNS(SVG_NS, "text");
                    text.setAttribute("x", x);
                    text.setAttribute("y", y);
                    text.setAttribute("aria-label", `${label}: ${value}`);
                    text.textContent = value;
                    overlay.appendChild(text);
                };
                const right = totals.xs[totals.xs.length - 1] + totals.cellWidth;
                const bottom = totals.ys[totals.ys.length - 1] + totals.cellHeight;
                totals.rows.forEach((value, index) => addTotal(right, totals.ys[index], value, `Row ${index + 1} total`));
                totals.columns.forEach((value, index) => addTotal(totals.xs[index], bottom, value, `Column ${index + 1} total`));
                svg.appendChild(overlay);
                displayedSvg = svg;
                displayedValues = values;
            }
        }

        watchPuzzle(sync, overlay, { childList: true, characterData: true, subtree: true });
    }

    if (/^\/(?:circle9|circle9j)\//.test(location.pathname)) {
        initCircleNine();
    } else if (/^\/circlesum\//.test(location.pathname)) {
        initCircleSum();
    }
})();
