(() => {
  const $ = id => document.getElementById(id);
  let mode = new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'login';
  let busy = false;
  const knownErrors = new Set(['authNotConfigured', 'authInvalidCredentials', 'authEmailUnconfirmed', 'authRateLimited', 'authInvalidInput', 'authSignupFailed']);
  function message(key, success = false) {
    I18N.bind($('loginError'), key);
    $('loginError').classList.toggle('auth-success', success);
  }
  function render() {
    const signup = mode === 'signup';
    $('signupFields').hidden = !signup;
    $('confirmPassword').required = signup;
    $('deckPassword').autocomplete = signup ? 'new-password' : 'current-password';
    $('deckPassword').minLength = signup ? 8 : 1;
    $('passwordHelp').hidden = !signup;
    I18N.bind($('authSubmit'), signup ? 'authCreateAccount' : 'login');
    I18N.bind($('switchAuth'), signup ? 'authHaveAccount' : 'authNeedAccount');
    I18N.bind($('authHeading'), signup ? 'authCreateAccount' : 'myDecks');
  }
  $('switchAuth').onclick = () => {
    if (busy) return;
    mode = mode === 'login' ? 'signup' : 'login';
    $('deckPassword').value = ''; $('confirmPassword').value = '';
    $('loginError').textContent = ''; delete $('loginError').dataset.i18n;
    render(); $('authEmail').focus();
  };
  $('deckLoginForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !$('deckLoginForm').reportValidity()) return;
    const email = $('authEmail').value.trim();
    const password = $('deckPassword').value;
    if (mode === 'signup' && password !== $('confirmPassword').value) { message('authPasswordMismatch'); $('confirmPassword').focus(); return; }
    busy = true; $('authSubmit').disabled = true; $('switchAuth').disabled = true;
    $('deckLoginForm').setAttribute('aria-busy', 'true');
    message('authWorking');
    try {
      const result = await DeckAccess[mode](email, password);
      $('deckPassword').value = ''; $('confirmPassword').value = '';
      if (result.confirmationRequired) { mode = 'login'; render(); message('authCheckEmail', true); }
      else window.location.replace('my-decks.html');
    } catch (error) {
      message(knownErrors.has(error.message) ? error.message : 'authUnavailable');
      $('deckPassword').value = ''; $('confirmPassword').value = '';
    } finally {
      busy = false; $('authSubmit').disabled = false; $('switchAuth').disabled = false;
      $('deckLoginForm').removeAttribute('aria-busy');
    }
  });
  // Supabase verifies confirmation links. Require password login afterwards;
  // never accept a session supplied in a URL (login CSRF).
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
    message(fragment.has('error') ? 'authConfirmationFailed' : 'authEmailConfirmed', !fragment.has('error'));
  }
  render();
  void DeckAccess.ready.then(() => {
    if (DeckAccess.allowed()) window.location.replace('my-decks.html');
    else if (DeckAccess.error() && DeckAccess.error() !== 'authRequired') message(knownErrors.has(DeckAccess.error()) ? DeckAccess.error() : 'authUnavailable');
  });
})();
