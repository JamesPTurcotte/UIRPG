UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Modal = (() => {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');

  function show(html) {
    content.innerHTML = html;
    modal.classList.remove('hidden');
  }

  function close() {
    modal.classList.add('hidden');
    content.innerHTML = '';
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  function confirm(message, onYes) {
    show(
      `<p class="modal-copy">${message}</p>
       <div class="modal-actions">
         <button type="button" data-act="modal-yes">Abandon</button>
         <button type="button" data-act="modal-no">Stay</button>
       </div>`
    );
    modal._onYes = onYes;
  }

  return { show, close, confirm };
})();
