// Small interactivity: reveal secret, print/save, cute emoji pulse
document.addEventListener('DOMContentLoaded', () => {
  // avoid browser auto-restoring a non-top scroll position when the page is re-shown (back/reload on mobile)
  if ('scrollRestoration' in history) { try { history.scrollRestoration = 'manual'; } catch(e){} }
  const revealBtn = document.getElementById('revealBtn');
  const secret = document.getElementById('secret');
  const shareBtn = document.getElementById('shareBtn');
  const cuteToggle = document.getElementById('cuteToggle');

  // (Removed duplicate simple reveal handler.)
  // The main reveal logic (with scroll behavior) is defined later so it runs only once.

  shareBtn.addEventListener('click', () => {
    window.print();
  });

  cuteToggle.addEventListener('click', () => {
    const pressed = cuteToggle.getAttribute('aria-pressed') === 'true';
    cuteToggle.setAttribute('aria-pressed', String(!pressed));
    cuteToggle.classList.toggle('activated');
    makeHeartPop();
  });

  function makeHeartPop(){
    const el = document.createElement('span');
    el.className = 'heart';
    el.textContent = '💖';
    document.body.appendChild(el);
    const x = window.innerWidth/2 + (Math.random()-0.5)*160;
    const y = window.innerHeight/2 + (Math.random()-0.5)*120;
    el.style.position = 'fixed';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.zIndex = 9999;
    setTimeout(()=> el.classList.add('pop'), 30);
    setTimeout(()=> el.remove(), 900);
  }

  /* --- SIMPLE ONE-LEVEL GAME: Click hearts to reach target before timer runs out --- */
  const overlay = document.getElementById('gameOverlay');
  const mainPage = document.querySelector('main.page');
  const startBtn = document.getElementById('startGame');
  const resetBtn = document.getElementById('resetGame');
  const playfield = document.getElementById('playfield');
  const scoreEl = document.getElementById('score');
  const targetEl = document.getElementById('target');
  const timerEl = document.getElementById('timer');

  let target = parseInt(targetEl.textContent, 10) || 5;
  let timeLimit = parseInt(timerEl.textContent, 10) || 15;
  let score = 0;
  let spawnInterval = null;
  let timerInterval = null;
  let remainingTime = timeLimit;
  let unlocked = false; // not persisted — require replay after reload
  // Debug/status element to help trace start-button problem (visible in-page)
  const overlayCard = overlay && overlay.querySelector('.overlay-card');
  let startStatus = null;
  if(overlayCard){
    startStatus = document.createElement('div');
    startStatus.id = 'startStatus';
    startStatus.textContent = 'Siap';
    startStatus.style.cssText = 'position:absolute;right:12px;top:12px;padding:6px 8px;border-radius:10px;background:linear-gradient(90deg,#fff,#f7f7ff);color:#333;font-weight:700;font-size:12px;box-shadow:0 6px 14px rgba(0,0,0,0.08);z-index:100002';
    overlayCard.appendChild(startStatus);
  }

  function isOverlayVisible(){
    return !overlay.classList.contains('hidden');
  }

  // helper to block scroll/touch when overlay is active
  function preventDefault(e){
    e.preventDefault();
  }

  function showOverlay(show){
    if(!overlay) return;

    if(show){
      // ensure overlay participates in layout and is visible
      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');
      overlay.classList.remove('shake');
      // mark background as inert for accessibility
      mainPage.setAttribute('aria-hidden', 'true');
      mainPage.style.visibility = 'hidden';
      // prevent background scrolling while game is active
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.addEventListener('wheel', preventDefault, { passive: false });
      document.addEventListener('touchmove', preventDefault, { passive: false });
      // ensure secret cannot be accessed while overlay is active
      revealBtn.disabled = true;
      shareBtn.disabled = true;
      // status UI
      if(startStatus) startStatus.textContent = 'Siap';
      if(startBtn) { startBtn.disabled = false; startBtn.focus(); }
    } else {
        // hide visually first (animation will run)
        overlay.classList.add('hidden');
        // after transition completes, remove from layout entirely so it can't interfere with scrolling
        const onTransitionEnd = () => {
          overlay.style.display = 'none';
          overlay.removeEventListener('transitionend', onTransitionEnd);
        };
        overlay.addEventListener('transitionend', onTransitionEnd);

        mainPage.setAttribute('aria-hidden', 'false');
        mainPage.style.visibility = 'visible';
        // fully restore body scrolling/touch styles (remove properties to allow CSS to win)
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('touch-action');
        document.removeEventListener('wheel', preventDefault);
        document.removeEventListener('touchmove', preventDefault);
        revealBtn.disabled = false;
        shareBtn.disabled = false;
        if(startStatus) startStatus.textContent = 'Selesai';
        // move focus back to the page to avoid any focus trapping by the (now-hidden) overlay
        try{ document.activeElement && document.activeElement.blur(); }catch(e){}
        try{ mainPage.querySelector('h1, h2, p, button')?.focus(); }catch(e){}
    }
  }

  function resetGameState(){
    score = 0;
    remainingTime = timeLimit;
    scoreEl.textContent = score;
    timerEl.textContent = remainingTime;
    clearInterval(spawnInterval); spawnInterval = null;
    clearInterval(timerInterval); timerInterval = null;
    playfield.innerHTML = '';
  }

  function spawnHeart(){
    const heart = document.createElement('button');
    heart.className = 'game-heart';
    heart.type = 'button';
    heart.innerText = '💖';
    // place randomly inside playfield
    const rect = playfield.getBoundingClientRect();
    const x = Math.random() * (rect.width - 56);
    const y = Math.random() * (rect.height - 56);
    heart.style.position = 'absolute';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';

    heart.addEventListener('click', () => {
      score += 1;
      scoreEl.textContent = score;
      heart.remove();
      makeHeartPop();
      if(score >= target){
        endGame(true);
      }
    });

    playfield.appendChild(heart);

    // auto-remove after some time so playfield doesn't fill
    setTimeout(()=> heart.remove(), 1400);
  }

  function tick(){
    remainingTime -= 1;
    timerEl.textContent = remainingTime;
    if(remainingTime <= 0){
      endGame(false);
    }
  }

  // Use a running flag to prevent double-starts and improve robustness
  let gameRunning = false;

  function startGameImpl(){
    // make sure overlay is visible and background locked
    showOverlay(true);
    resetGameState();
    spawnHeart(); // immediate heart
    spawnInterval = setInterval(spawnHeart, 650);
    timerInterval = setInterval(tick, 1000);
  }

  function startGame(){
    if(gameRunning) return;
    gameRunning = true;
    if(startBtn) startBtn.disabled = true;
    if(startStatus) startStatus.textContent = 'Berjalan...';
    console.log('Game started');
    startGameImpl();
  }

  function endGame(won){
    clearInterval(spawnInterval); spawnInterval = null;
    clearInterval(timerInterval); timerInterval = null;
    playfield.innerHTML = '';
    if(won){
      unlocked = true; // only in-memory: refresh requires replay
      showOverlay(false);
      // celebration
      for(let i=0;i<6;i++) setTimeout(makeHeartPop, i*120);
      // attempt to force the page to the very top quickly
      setTimeout(()=>{
        try{
          forceScrollToTop();
        }catch(e){ console.warn('Auto-scroll failed', e); }
      }, 48);
    } else {
      // brief shake and reset UI
      overlay.classList.add('shake');
      setTimeout(()=> overlay.classList.remove('shake'), 400);
    }
    // re-enable start button and allow retry
    gameRunning = false;
    if(startBtn) startBtn.disabled = false;
    if(startStatus) startStatus.textContent = won ? 'Menang 🎉' : 'Kalah';
    console.log('Game ended', {won, score});
  }

  // Attach robust start controls (click, pointer, touch, keyboard)
  if(startBtn){
    startBtn.disabled = false;
    startBtn.tabIndex = 0;
    const startHandler = (e) => { console.log('startHandler triggered', e && e.type); if(e) e.preventDefault(); startGame(); };
    startBtn.addEventListener('click', startHandler);
    startBtn.addEventListener('pointerdown', startHandler);
    startBtn.addEventListener('touchstart', startHandler, { passive: false });
    startBtn.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { console.log('start via keyboard'); e.preventDefault(); startGame(); } });
    // also listen on overlay card to see clicks reaching the container
    if(overlayCard){
      overlayCard.addEventListener('click', (e) => {
        const hit = e.target.closest && e.target.closest('#startGame');
        console.log('overlay click', e.target.tagName, 'hitStart?', !!hit);
      });
    }
  } else {
    console.warn('startGame button not found — using delegated click listener');
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#startGame');
      if(btn){ console.log('delegated click for start'); e.preventDefault(); startGame(); }
    });
  }

  if(resetBtn){
    resetBtn.addEventListener('click', ()=>{
      unlocked = false;
      resetGameState();
      showOverlay(true);
    });
  }

  // initialize: always require playing the game on fresh load
  showOverlay(true);

  // utility: force page to top reliably across devices (mobile-first) - used after winning
  function forceScrollToTop(maxTries = 10){
    const scrollingEl = document.scrollingElement || document.documentElement;

    let tries = 0;
    const immediateTop = () => {
      try{ scrollingEl.scrollTop = 0; }catch(e){}
      try{ document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }catch(e){}
      try{ window.scrollTo(0, 0); }catch(e){}
      if(window.visualViewport && typeof window.visualViewport.scrollTo === 'function'){
        try{ window.visualViewport.scrollTo({ left: 0, top: 0, behavior: 'auto' }); }catch(e){}
      }
    };

    const check = () => {
      const firstHeading = document.getElementById('letter-title') || mainPage.querySelector('h1, h2');
      const vTop = (window.visualViewport && typeof window.visualViewport.offsetTop === 'number') ? window.visualViewport.offsetTop : 0;
      const top = firstHeading ? (firstHeading.getBoundingClientRect().top - vTop) : 0;

      // we consider ourselves successful when the heading is at (or very close to) the top OR we've tried enough
      if(top <= 2 || tries >= maxTries){
        try{
          // final absolute top snap
          try{ window.scrollTo({ top: 0, behavior: 'auto' }); }catch(e){}
          setTimeout(()=>{ try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e){} }, 60);

          if(firstHeading){
            firstHeading.tabIndex = -1;
            try{ firstHeading.focus({ preventScroll: true }); }catch(e){ try{ firstHeading.focus(); }catch(e){} }
          }
        }catch(e){}

        // cleanup listeners that restore focus-only bookkeeping
        const restore = () => {
          try{ const fh = document.getElementById('letter-title') || mainPage.querySelector('h1, h2'); if(fh && fh.getAttribute('tabindex') === '-1') fh.removeAttribute('tabindex'); }catch(e){}
          window.removeEventListener('scroll', restore);
          window.removeEventListener('pointerdown', restore);
          window.removeEventListener('touchstart', restore);
          if(restoreTimer) clearTimeout(restoreTimer);
        };
        window.addEventListener('scroll', restore, { passive: true });
        window.addEventListener('pointerdown', restore, { passive: true });
        window.addEventListener('touchstart', restore, { passive: true });
        const restoreTimer = setTimeout(restore, 7000);
        console.log('forceScrollToTop done', {tries, top});
        return;
      }
      // try again
      tries++;
      immediateTop();
      setTimeout(check, 120);
    };

    // start
    immediateTop();
    setTimeout(()=>{
      immediateTop();
      setTimeout(check, 80);
    }, 40);
  }

  // central helper: reveal the secret and scroll it into view
  function revealSecret({auto=false} = {}){
    // if overlay is visible we shouldn't reveal
    if(isOverlayVisible()) return;

    const showing = !secret.classList.contains('hidden');
    if(showing){
      secret.classList.add('hidden');
      secret.setAttribute('aria-hidden', 'true');
      revealBtn.setAttribute('aria-pressed', 'false');
      revealBtn.textContent = 'Love';
      return;
    }

    // show secret
    secret.classList.remove('hidden');
    secret.setAttribute('aria-hidden', 'false');
    revealBtn.setAttribute('aria-pressed', 'true');
    revealBtn.textContent = 'Love';

    // add little sparkle animation
    makeHeartPop();

    // wait a bit for layout to settle after overlay is removed, then ensure we are at the absolute top
    setTimeout(()=>{
      try{
        requestAnimationFrame(()=>{
          requestAnimationFrame(()=>{
            // always prioritize absolute top so mobile lands at the very top; show secret but don't force viewport away from top
            try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e){}
            try{ secret.tabIndex = -1; secret.focus({ preventScroll: true }); }catch(e){ try{ secret.focus(); }catch(e){} }
            console.log('Revealed secret and scrolled to top', {auto});
          });
        });
      }catch(err){
        console.warn('Scroll to top after reveal failed', err);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  }

  // update reveal behaviour: prevent reveal if overlay visible and auto-scroll to top when revealing
  revealBtn.addEventListener('click', () => {
    // if game overlay is active, do nothing (button is disabled anyway)
    if(isOverlayVisible()) return;
    // only allow reveal after the game is won / unlocked
    if(!unlocked){
      // small visual hint: focus and shake the button briefly
      try{ revealBtn.classList.add('shake'); setTimeout(()=> revealBtn.classList.remove('shake'), 420); }catch(e){}
      return;
    }
    revealSecret({auto:false});
  });

});
