if (DeckAccess.allowed()) window.location.replace('my-decks.html');
document.getElementById('deckLoginForm').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('deckPassword');
  const correct = input.value === 'teamsandwich';
  if (DeckAccess.login(input.value)) {
    input.value = '';
    window.location.replace('my-decks.html');
    return;
  }
  I18N.bind(document.getElementById('loginError'), correct ? 'loginStorageBlocked' : 'wrongPassword');
  input.setAttribute('aria-invalid', 'true');
  input.value = '';
  input.focus();
});
