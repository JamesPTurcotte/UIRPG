// ============================================================
// TEMPLATE: Creating a Dropdown Menu
// ============================================================
// Standard pattern: .dropdown wrapper + showMenu() + closeMenus().
// All menus use the same CSS classes — no inline styles.
// ============================================================

// ─── HTML ───
// <div class="dropdown">
//   <button data-action="TODO-toggle">TODO Button</button>
//   <div class="dropdown-menu" id="TODO-menu-id"></div>
// </div>

// ─── CSS (already in styles.css) ───
// .dropdown { position: relative; display: inline-block; }
// .dropdown-menu {
//   display: none; position: absolute; top: 100%; left: 0;
//   min-width: 160px; max-height: min(300px, 60vh); overflow-y: auto;
// }
// .dropdown-menu.open { display: block; }
// .dropdown-menu.flip-up { top: auto; bottom: 100%; }
// .dropdown-item { padding: 3px 8px; cursor: pointer; color: var(--text); }

// ─── JS: showMenu() helper (already in main.js) ───
// function showMenu(menu) {
//   document.querySelectorAll('.dropdown-menu.open').forEach(m => {
//     if (m !== menu) m.classList.remove('open', 'flip-up');
//   });
//   menu.classList.remove('flip-up');
//   menu.classList.add('open');
//   void menu.offsetHeight;
//   if (menu.getBoundingClientRect().bottom > window.innerHeight - 4) {
//     menu.classList.add('flip-up');
//   }
// }

// ─── JS: closeMenus() helper (already in main.js) ───
// function closeMenus() {
//   document.querySelectorAll('.dropdown-menu').forEach(m => {
//     m.classList.remove('open', 'flip-up');
//   });
// }

// ─── JS: Open the menu (in onClick) ───
// } else if (action === 'TODO-toggle') {
//   const menu = document.getElementById('TODO-menu-id');
//   menu.innerHTML = `<div class="dropdown-item" data-action="TODO-action" data-value="...">Option</div>`;
//   showMenu(menu);
//   saveAndRender();
// }

// ─── JS: Handle item clicks ───
// } else if (action === 'TODO-action') {
//   const val = el.dataset.value;
//   // ... handle selection ...
//   closeMenus();
//   saveAndRender();
// }

// ─── Close on outside click (already in main.js) ───
// document.addEventListener('click', function(e) {
//   if (!document.body.contains(e.target)) return;        // ⚠️ destroyed element guard
//   if (!e.target.closest('.dropdown')) closeMenus();
// });

// ⚠️ CRITICAL GOTCHA: When innerHTML is replaced inside a menu item's onClick
// handler (e.g. clicking "Zones" → replaces content with zone list), the
// clicked element is DESTROYED. The document close handler fires AFTER onClick
// and tries e.target.closest('.dropdown') — but since the element is no longer
// in the DOM, closest() returns null and the handler closes the menu.
//
// The guard `!document.body.contains(e.target)` prevents this: if the clicked
// element was destroyed, skip the close handler entirely.

// ─── Nested / multi-level menus (replace-content pattern) ───
// Use the SAME menu element — swap innerHTML instead of creating a second menu.
// Always call showMenu() after changing content so the viewport flip is rechecked.
//
// Level 1:
// } else if (action === 'TODO-toggle') {
//   menu.innerHTML = '<div class="dropdown-item" data-action="show-sub">Submenu ▸</div>';
//   showMenu(menu);
//   saveAndRender();
// }
//
// Level 2 (replaces content):
// } else if (action === 'show-sub') {
//   menu.innerHTML =
//     '<div class="dropdown-item" data-action="back-to-main">◀ Back</div>' +
//     '<div class="dropdown-item" data-action="TODO-action" data-value="...">Option</div>';
//   showMenu(menu);
//   saveAndRender();
// }
//
// Back button:
// } else if (action === 'back-to-main') {
//   menu.innerHTML = '<div class="dropdown-item" data-action="show-sub">Submenu ▸</div>';
//   showMenu(menu);
//   saveAndRender();
// }

// ─── Verification ───
// 1. Click trigger → menu appears below the button
// 2. If menu overflows viewport bottom → flips above via .flip-up
// 3. Click a menu item → action fires, menu closes
// 4. Click outside → menu closes
// 5. Replace-content sub-menu: click item → content swaps, menu stays open
// 6. Back button: restores previous content, menu stays open
// 7. Destroyed element guard: clicking an item that replaces innerHTML
//    doesn't cause the close handler to erroneously close the menu
