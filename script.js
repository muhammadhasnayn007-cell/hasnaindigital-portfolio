document.addEventListener('DOMContentLoaded',()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const yearEl=$('#year');
  if(yearEl) yearEl.textContent=new Date().getFullYear();
  const backToTop=$('#backToTopBtn');
  if(backToTop){
    backToTop.addEventListener('click',e=>{
      e.preventDefault();
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  // Animated mobile navigation
  const toggle=$('.nav-toggle'), nav=$('.main-nav');
  if(toggle&&nav){
    const close=()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click',e=>{e.stopPropagation();const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
    $$('.nav-link',nav).forEach((a,i)=>a.addEventListener('click',()=>setTimeout(close,220)));
    document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!nav.contains(e.target)&&!toggle.contains(e.target))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  }

  // Scroll reveal with stagger
  const reveals=$$('.reveal,.reveal-left,.reveal-right,.reveal-scale,.reveal-up');
  const ro=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    const d=Number(entry.target.dataset.delay||0);
    entry.target.style.transitionDelay=`${d}ms`;
    entry.target.classList.add('show');
    ro.unobserve(entry.target);
  }),{threshold:.12,rootMargin:'0px 0px -7% 0px'});
  reveals.forEach(el=>ro.observe(el));

  // Timeline trigger
  const timelines=$$('.timeline');
  const to=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('active');to.unobserve(e.target);}}),{threshold:.25});
  timelines.forEach(el=>to.observe(el));

  // Counter animation
  const counters=$$('[data-count]');
  const co=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(!e.isIntersecting)return;
    const el=e.target,target=Number(el.dataset.count),dur=1300,t0=performance.now();
    const suffix=target===100?'%':target===24?'/7':'+';
    const tick=t=>{const p=Math.min(1,(t-t0)/dur),ease=1-Math.pow(1-p,3);el.textContent=Math.round(target*ease)+suffix;if(p<1)requestAnimationFrame(tick)};
    requestAnimationFrame(tick);co.unobserve(el);
  }),{threshold:.6});
  counters.forEach(el=>co.observe(el));

  // Active nav by section
  const links=$$('.nav-link');
  const sections=links.map(a=>$(a.getAttribute('href'))).filter(Boolean);
  const so=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.hash===`#${entry.target.id}`));}),{rootMargin:'-35% 0px -50% 0px'});
  sections.forEach(s=>so.observe(s));

  // Smooth anchor with sticky header compensation
  $$('a[href^="#"]:not(#backToTopBtn)').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(!id||id==='#')return;const target=$(id);if(!target)return;e.preventDefault();window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-78,behavior:'smooth'});}));

  // Large HASNAIN watermark is animated right-to-left by CSS.
  // Keep it deterministic on scroll rather than overriding the CSS animation.

  // Cursor glow
  const glow=$('.cursor-glow');
  if(glow&&matchMedia('(pointer:fine)').matches) addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px';},{passive:true});
  else if(glow)glow.remove();

  // Pointer light inside cards + subtle 3D tilt
  if(matchMedia('(pointer:fine)').matches){
    $$('[data-tilt]').forEach(card=>{
      const move=e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty('--mx',(x*100)+'%');card.style.setProperty('--my',(y*100)+'%');card.style.transform=`perspective(1100px) rotateX(${(0.5-y)*3.5}deg) rotateY(${(x-0.5)*5}deg) translateY(-7px)`;};
      card.addEventListener('pointermove',move);card.addEventListener('pointerleave',()=>card.style.transform='');
    });
    const portrait=$('.tilt-target');
    if(portrait){portrait.addEventListener('pointermove',e=>{const r=portrait.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;portrait.style.transform=`perspective(1100px) rotateX(${(0.5-y)*4}deg) rotateY(${(x-0.5)*6}deg) translateZ(7px)`});portrait.addEventListener('pointerleave',()=>portrait.style.transform='');}
  }

  // Magnetic hover for CTAs
  if(matchMedia('(pointer:fine)').matches){
    $$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;el.style.transform=`translate(${x*.12}px,${y*.12}px)`});el.addEventListener('pointerleave',()=>el.style.transform='');});
  }

  // Button ripple
  $$('.ripple').forEach(el=>el.addEventListener('pointerdown',e=>{const r=el.getBoundingClientRect(),s=document.createElement('span');s.className='click-ripple';s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';el.appendChild(s);setTimeout(()=>s.remove(),700);}));

  // FAQ — single-open accordion with synced accessibility state
  $$('.faq').forEach(item=>{
    item.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
    item.addEventListener('click',()=>{
      const wasOpen=item.classList.contains('open');
      $$('.faq').forEach(other=>{other.classList.remove('open');other.setAttribute('aria-expanded','false');});
      item.classList.toggle('open',!wasOpen);
      item.setAttribute('aria-expanded',String(!wasOpen));
    });
    item.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();item.click();}
    });
  });

  // Professional project case-study modal
  const projectCopy = {
    'SEO': {
      title: 'SEARCH GROWTH STRATEGY',
      type: 'Case Study',
      challenge: 'A business website needed enhanced organic discoverability, technical crawl hygiene, and clear search-intent alignment for competitive keywords.',
      solution: 'Conducted a complete technical SEO audit, resolved crawl indexation barriers, mapped high-intent target keywords, and structured content architecture with semantic schema.',
      process: 'Technical Audit → Keyword Research → On-Page Optimization → Schema Markup → Search Console Monitoring',
      technologies: ['Technical SEO', 'Google Search Console', 'GA4', 'Schema.org', 'HTML5 Semantic Architecture'],
      outcome: 'Established clean indexing, improved Core Web Vitals, and structured keyword clusters for sustainable search rankings.',
      tags: ['TECHNICAL SEO', 'ON-PAGE', 'ANALYTICS'],
      img: 'images/project-seo.svg'
    },
    'Digital Marketing': {
      title: 'GROWTH MARKETING CAMPAIGN',
      type: 'Case Study',
      challenge: 'Converting incoming web traffic into qualified leads required a streamlined funnel and cohesive digital campaign messaging.',
      solution: 'Designed a multi-touchpoint marketing funnel with targeted landing pages, value propositions, and clear conversion paths.',
      process: 'Audience Analysis → Funnel Architecture → Landing Page Messaging → Conversion Tracking',
      technologies: ['Marketing Strategy', 'Content SEO', 'CRO', 'Analytics'],
      outcome: 'Improved user engagement and established transparent conversion measurement across campaign channels.',
      tags: ['STRATEGY', 'CONTENT', 'CAMPAIGNS'],
      img: 'images/project-marketing.svg'
    },
    'Web Development': {
      title: 'BUSINESS WEBSITE BUILD',
      type: 'Demo Project',
      challenge: 'Building a lightning-fast, fully responsive business portfolio with zero layout shifts, dark glassmorphism aesthetic, and accessible controls.',
      solution: 'Built a clean front-end and Node.js backend architecture with instant response times, fluid mobile navigation, and real-time contact validation.',
      process: 'UI Prototyping → Responsive Coding → API Integration → Performance Testing',
      technologies: ['HTML5', 'CSS3', 'JavaScript', 'Node.js', 'Express', 'REST APIs'],
      outcome: 'Achieved optimal Core Web Vitals scores and smooth interaction across mobile, tablet, and desktop devices.',
      tags: ['HTML/CSS', 'JAVASCRIPT', 'RESPONSIVE'],
      img: 'images/project-web.svg'
    },
    'UI/UX Design': {
      title: 'PRODUCT UX EXPERIENCE',
      type: 'Demo Project',
      challenge: 'Designing an intuitive, visually striking interface system for a modern digital platform with clear visual hierarchy.',
      solution: 'Constructed end-to-end design specifications, interactive Figma prototypes, and a unified design system with dark-mode aesthetic.',
      process: 'User Journeys → Wireframes → High-Fidelity Mockups → Interactive Prototyping',
      technologies: ['Figma', 'Wireframes', 'Design Systems', 'Interaction Design'],
      outcome: 'Delivered a refined, accessible UI prototype with tested user task completion flows.',
      tags: ['RESEARCH', 'WIREFRAMES', 'SYSTEM'],
      img: 'images/project-ui.svg'
    }
  };

  const modal = document.createElement('div');
  modal.className = 'case-modal';
  modal.innerHTML = `
    <div class="case-modal-card" role="dialog" aria-modal="true" aria-label="Project case study">
      <button class="case-modal-close" type="button" aria-label="Close modal">×</button>
      <div class="case-modal-visual"><img alt=""></div>
      <div class="case-modal-content">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span class="case-modal-kicker">SELECTED PROJECT</span>
          <span class="case-modal-type-badge" style="padding:2px 8px;border-radius:999px;font:700 9px Oswald,sans-serif;letter-spacing:1px;background:rgba(227,19,27,0.18);border:1px solid rgba(227,19,27,0.4);color:#ff4d5a;"></span>
        </div>
        <h4></h4>
        <div class="case-modal-breakdown" style="display:grid;gap:14px;margin:18px 0;font-size:12px;line-height:1.65;color:#c8c1bc;">
          <div><strong style="color:#ffffff;display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Challenge</strong><span class="cm-challenge"></span></div>
          <div><strong style="color:#ffffff;display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Solution</strong><span class="cm-solution"></span></div>
          <div><strong style="color:#ffffff;display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Process</strong><span class="cm-process"></span></div>
          <div><strong style="color:#ffffff;display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Outcome</strong><span class="cm-outcome"></span></div>
        </div>
        <div class="case-modal-tags"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalClose = $('.case-modal-close', modal);
  const modalImg = $('.case-modal-visual img', modal);
  const modalTitle = $('h4', modal);
  const modalTypeBadge = $('.case-modal-type-badge', modal);
  const cmChallenge = $('.cm-challenge', modal);
  const cmSolution = $('.cm-solution', modal);
  const cmProcess = $('.cm-process', modal);
  const cmOutcome = $('.cm-outcome', modal);
  const modalTags = $('.case-modal-tags', modal);

  const openProject = key => {
    const d = projectCopy[key];
    if (!d) return;
    modalImg.src = d.img;
    modalImg.alt = d.title;
    modalTitle.textContent = d.title;
    modalTypeBadge.textContent = d.type;
    cmChallenge.textContent = d.challenge;
    cmSolution.textContent = d.solution;
    cmProcess.textContent = d.process;
    cmOutcome.textContent = d.outcome;
    modalTags.innerHTML = d.tags.map(t => '<span>' + t + '</span>').join('');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  };

  const closeProject = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  modalClose.addEventListener('click', closeProject);
  modal.addEventListener('click', e => { if (e.target === modal) closeProject(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProject(); });

  $$('.project').forEach(card => {
    card.setAttribute('tabindex', '0');
    const open = () => openProject(card.dataset.project);
    card.addEventListener('click', e => { if (e.target.closest('a,button')) return; open(); });
    card.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !modal.classList.contains('open')) {
        e.preventDefault();
        open();
      }
    });
  });

  // ==========================================================================
  // Modernized & Deployment-Proof Contact Form Controller
  // Features: Real-time accessible validation, loading state, multi-tiered
  // submission (Vercel/Netlify /api/contact -> FormSubmit static -> mailto fallback),
  // and screen-reader status announcements.
  // ==========================================================================
  const contactForm = $('#contactForm');
  if (contactForm) {
    const alertBox = $('#formAlert');
    const submitBtn = $('#contactSubmitBtn');
    const note = $('#formNote');

    const nameInput = $('#contact-name');
    const emailInput = $('#contact-email');
    const subjectInput = $('#contact-subject');
    const serviceSelect = $('#contact-service');
    const messageInput = $('#contact-message');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setFieldError = (input, errorId, msg) => {
      if (!input) return;
      const group = input.closest('.form-group');
      const errEl = $('#' + errorId);
      if (group) group.classList.add('has-error');
      if (group) group.classList.remove('is-valid');
      if (errEl) errEl.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
    };

    const clearFieldError = (input, errorId) => {
      if (!input) return;
      const group = input.closest('.form-group');
      const errEl = $('#' + errorId);
      if (group) group.classList.remove('has-error');
      if (group && input.value.trim().length > 0) group.classList.add('is-valid');
      if (errEl) errEl.textContent = '';
      input.removeAttribute('aria-invalid');
    };

    // Real-time validation after interaction
    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        if (!nameInput.value.trim()) setFieldError(nameInput, 'name-error', 'Please enter your full name.');
        else if (nameInput.value.trim().length < 2) setFieldError(nameInput, 'name-error', 'Name must be at least 2 characters.');
        else clearFieldError(nameInput, 'name-error');
      });
      nameInput.addEventListener('input', () => {
        if (nameInput.closest('.form-group')?.classList.contains('has-error')) {
          if (nameInput.value.trim().length >= 2) clearFieldError(nameInput, 'name-error');
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        const val = emailInput.value.trim();
        if (!val) setFieldError(emailInput, 'email-error', 'Please enter your email address.');
        else if (!emailRegex.test(val)) setFieldError(emailInput, 'email-error', 'Please enter a valid email (e.g. name@example.com).');
        else clearFieldError(emailInput, 'email-error');
      });
      emailInput.addEventListener('input', () => {
        if (emailInput.closest('.form-group')?.classList.contains('has-error')) {
          if (emailRegex.test(emailInput.value.trim())) clearFieldError(emailInput, 'email-error');
        }
      });
    }

    if (subjectInput) {
      subjectInput.addEventListener('blur', () => {
        if (!subjectInput.value.trim()) setFieldError(subjectInput, 'subject-error', 'Please enter a subject.');
        else if (subjectInput.value.trim().length < 3) setFieldError(subjectInput, 'subject-error', 'Subject must be at least 3 characters.');
        else clearFieldError(subjectInput, 'subject-error');
      });
      subjectInput.addEventListener('input', () => {
        if (subjectInput.closest('.form-group')?.classList.contains('has-error')) {
          if (subjectInput.value.trim().length >= 3) clearFieldError(subjectInput, 'subject-error');
        }
      });
    }

    if (messageInput) {
      messageInput.addEventListener('blur', () => {
        if (!messageInput.value.trim()) setFieldError(messageInput, 'message-error', 'Please provide project details.');
        else if (messageInput.value.trim().length < 10) setFieldError(messageInput, 'message-error', 'Please write at least 10 characters.');
        else clearFieldError(messageInput, 'message-error');
      });
      messageInput.addEventListener('input', () => {
        if (messageInput.closest('.form-group')?.classList.contains('has-error')) {
          if (messageInput.value.trim().length >= 10) clearFieldError(messageInput, 'message-error');
        }
      });
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot spam protection check
      const honey = contactForm.querySelector('[name="_honey"]');
      if (honey && honey.value) return;

      // Validate all fields
      let isValid = true;
      let firstInvalid = null;

      const nameVal = nameInput ? nameInput.value.trim() : '';
      if (!nameVal || nameVal.length < 2) {
        setFieldError(nameInput, 'name-error', 'Please enter your full name (at least 2 characters).');
        isValid = false;
        firstInvalid = firstInvalid || nameInput;
      } else {
        clearFieldError(nameInput, 'name-error');
      }

      const emailVal = emailInput ? emailInput.value.trim() : '';
      if (!emailVal || !emailRegex.test(emailVal)) {
        setFieldError(emailInput, 'email-error', 'Please enter a valid email address.');
        isValid = false;
        firstInvalid = firstInvalid || emailInput;
      } else {
        clearFieldError(emailInput, 'email-error');
      }

      const subjectVal = subjectInput ? subjectInput.value.trim() : '';
      if (!subjectVal || subjectVal.length < 3) {
        setFieldError(subjectInput, 'subject-error', 'Please enter a subject (at least 3 characters).');
        isValid = false;
        firstInvalid = firstInvalid || subjectInput;
      } else {
        clearFieldError(subjectInput, 'subject-error');
      }

      const messageVal = messageInput ? messageInput.value.trim() : '';
      if (!messageVal || messageVal.length < 10) {
        setFieldError(messageInput, 'message-error', 'Please provide project details (at least 10 characters).');
        isValid = false;
        firstInvalid = firstInvalid || messageInput;
      } else {
        clearFieldError(messageInput, 'message-error');
      }

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Enter loading/submitting state
      contactForm.setAttribute('aria-busy', 'true');
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      const btnText = submitBtn.querySelector('.btn-text');
      const origText = btnText ? btnText.textContent : 'SEND MESSAGE';
      if (btnText) btnText.textContent = 'SENDING…';

      if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.className = 'form-alert';
        alertBox.textContent = '';
      }
      if (note) note.textContent = 'Connecting to email service…';

      const recipient = 'muhammadhasnayn007@gmail.com';
      const serviceVal = serviceSelect ? serviceSelect.value : 'SEO & Digital Marketing';

      const payload = {
        name: nameVal,
        email: emailVal,
        subject: subjectVal,
        service: serviceVal,
        message: messageVal
      };

      let delivered = false;
      let serverErrorMsg = '';

      // Direct Production Flow: Visitor → Frontend → Backend (/api/contact) → Email Service → Inbox
      try {
        const apiRes = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await apiRes.json().catch(() => ({}));

        if (apiRes.ok && data.success) {
          delivered = true;
        } else {
          serverErrorMsg = data.error || (apiRes.status === 429 ? 'Too many requests. Please wait a minute before retrying.' : 'Server encountered an issue sending your email.');
        }
      } catch (err) {
        serverErrorMsg = 'Network connection error. Could not reach backend server.';
      }

      // Reset busy state
      contactForm.removeAttribute('aria-busy');
      submitBtn.classList.remove('loading');

      if (delivered) {
        // Persist inquiry to Firestore if Firebase is active
        if (window.FirebaseApp && typeof window.FirebaseApp.persistInquiryToFirestore === 'function') {
          window.FirebaseApp.persistInquiryToFirestore(payload);
        }

        // --- Success state ---
        if (alertBox) {
          alertBox.className = 'form-alert success';
          alertBox.innerHTML = `<strong>✓ Message Sent Successfully!</strong> Thank you, ${nameVal}. Your message has been delivered directly to Hasnain. I will respond to <em>${emailVal}</em> within 24 hours.`;
          alertBox.style.display = 'flex';
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (note) note.textContent = 'Message sent! Expect a prompt reply soon.';
        if (btnText) btnText.textContent = 'MESSAGE SENT ✓';

        contactForm.reset();
        $$('.form-group', contactForm).forEach(g => g.classList.remove('is-valid', 'has-error'));

        setTimeout(() => {
          submitBtn.disabled = false;
          if (btnText) btnText.textContent = origText;
        }, 4500);

      } else {
        // --- Error state (preserves form inputs for retry) ---
        const mailtoSubject = encodeURIComponent(`[Portfolio Inquiry] ${subjectVal} - ${nameVal}`);
        const mailtoBody = encodeURIComponent(
          `Name: ${nameVal}\nEmail: ${emailVal}\nService: ${serviceVal}\n\nMessage Details:\n${messageVal}`
        );
        const mailtoUrl = `mailto:${recipient}?subject=${mailtoSubject}&body=${mailtoBody}`;

        if (alertBox) {
          alertBox.className = 'form-alert error';
          alertBox.innerHTML = `<strong>✕ Delivery Notice:</strong> ${escapeHtml(serverErrorMsg)} <a href="${mailtoUrl}" id="directEmailFallback" style="color:#ffffff;text-decoration:underline;font-weight:700;margin-left:6px;">Send directly via email app ↗</a>`;
          alertBox.style.display = 'flex';
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (note) note.textContent = serverErrorMsg || 'Submission encountered an issue. You can retry or click the email link above.';
        if (btnText) btnText.textContent = 'RETRY SEND ↗';
        submitBtn.disabled = false;
      }
    });
  }

  // Helper function to escape HTML in frontend rendering
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // HASNAIN'S ASSISTANT - AI CLIENT & LEAD ASSISTANT CONTROLLER
  // ==========================================================================
  const chatLauncher = $('#chatLauncher');
  const chatDrawer = $('#chatDrawer');
  const chatMinimizeBtn = $('#chatMinimizeBtn');
  const chatMessages = $('#chatMessages');
  const chatForm = $('#chatForm');
  const chatInput = $('#chatInput');
  const chatSendBtn = $('#chatSendBtn');
  const chatHandoffBanner = $('#chatHandoffBanner');
  const chatTransferBtn = $('#chatTransferBtn');

  if (chatLauncher && chatDrawer) {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('hasnain_chat_session');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('hasnain_chat_session', sessionId);
    }

    const conversationHistory = [];
    let isWaitingResponse = false;
    let detectedService = '';

    const openChat = () => {
      chatDrawer.classList.add('open');
      chatDrawer.setAttribute('aria-hidden', 'false');
      chatLauncher.classList.add('chat-open');
      chatLauncher.setAttribute('aria-expanded', 'true');
      setTimeout(() => chatInput && chatInput.focus(), 250);
    };

    const closeChat = () => {
      chatDrawer.classList.remove('open');
      chatDrawer.setAttribute('aria-hidden', 'true');
      chatLauncher.classList.remove('chat-open');
      chatLauncher.setAttribute('aria-expanded', 'false');
    };

    chatLauncher.addEventListener('click', () => {
      if (chatDrawer.classList.contains('open')) {
        closeChat();
      } else {
        openChat();
      }
    });

    if (chatMinimizeBtn) {
      chatMinimizeBtn.addEventListener('click', closeChat);
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && chatDrawer.classList.contains('open')) {
        closeChat();
      }
    });

    const scrollChatToBottom = () => {
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    };

    const appendUserMessage = text => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble user';
      bubble.innerHTML = `
        <div class="bubble-content">
          <p>${escapeHtml(text)}</p>
        </div>
        <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      `;
      chatMessages.appendChild(bubble);
      scrollChatToBottom();
    };

    const appendAssistantMessage = (text, groundingSources = []) => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble assistant';
      
      // Detect action markers like [CONTACT HASNAIN], [START A PROJECT], [ACTION:CONTACT_HASNAIN]
      let actionLabel = null;
      const actionRegex = /\[(?:ACTION:)?(CONTACT_HASNAIN|START_PROJECT|CONTACT HASNAIN|START A PROJECT)\]/gi;
      const cleanedText = text.replace(actionRegex, (m, p1) => {
        const upper = p1.toUpperCase().replace(/_/g, ' ');
        if (upper.includes('START')) actionLabel = 'START A PROJECT';
        else actionLabel = 'CONTACT HASNAIN';
        return '';
      }).trim();

      // Convert line breaks and simple formatting
      const paragraphs = cleanedText.split('\n\n').filter(Boolean);
      let contentHtml = '';
      if (paragraphs.length > 1) {
        contentHtml = paragraphs.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
      } else {
        contentHtml = `<p>${escapeHtml(cleanedText).replace(/\n/g, '<br>')}</p>`;
      }

      let actionHtml = '';
      if (actionLabel) {
        actionHtml = `
          <div class="chat-action-container">
            <button type="button" class="chat-action-btn magnetic" data-action="contact">
              <span>${actionLabel}</span>
              <b>↗</b>
            </button>
          </div>
        `;
      }

      let groundingHtml = '';
      if (groundingSources && groundingSources.length > 0) {
        groundingHtml = `
          <div class="grounding-sources">
            <div class="grounding-sources-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              Google Search Data:
            </div>
            <div class="grounding-sources-list">
              ${groundingSources.map(s => `<a class="grounding-source-chip" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(s.title || s.url)}">↗ ${escapeHtml(s.title || s.url)}</a>`).join('')}
            </div>
          </div>
        `;
      }

      bubble.innerHTML = `
        <div class="bubble-content">
          ${contentHtml}
          ${actionHtml}
          ${groundingHtml}
        </div>
        <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      `;

      // Wire up Contact Hasnain / Start a Project action button
      const actionBtn = bubble.querySelector('.chat-action-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', e => {
          e.preventDefault();
          if (window.innerWidth <= 820) {
            closeChat();
          }
          const contactSection = document.getElementById('contact');
          if (contactSection) {
            window.scrollTo({
              top: contactSection.getBoundingClientRect().top + window.scrollY - 78,
              behavior: 'smooth'
            });
            const contactForm = document.getElementById('contactForm');
            if (contactForm) {
              contactForm.classList.add('focused-glow');
              setTimeout(() => contactForm.classList.remove('focused-glow'), 2200);
            }
          }
        });
      }

      chatMessages.appendChild(bubble);
      scrollChatToBottom();
    };

    const showTypingIndicator = () => {
      const indicator = document.createElement('div');
      indicator.className = 'chat-bubble assistant typing-indicator';
      indicator.id = 'chatTypingIndicator';
      indicator.innerHTML = `
        <div class="bubble-content">
          <div class="typing-dots" aria-label="Hasnain's Assistant is typing">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      `;
      chatMessages.appendChild(indicator);
      scrollChatToBottom();
    };

    const hideTypingIndicator = () => {
      const el = document.getElementById('chatTypingIndicator');
      if (el) el.remove();
    };

    const sendChatMessage = async messageText => {
      if (!messageText || isWaitingResponse) return;

      appendUserMessage(messageText);
      conversationHistory.push({ role: 'user', content: messageText });

      // Track candidate service mentioned in conversation
      const lower = messageText.toLowerCase();
      if (lower.includes('seo') || lower.includes('ranking')) detectedService = 'SEO & Search Growth';
      else if (lower.includes('python') || lower.includes('automation')) detectedService = 'Python Development';
      else if (lower.includes('ui') || lower.includes('ux') || lower.includes('design')) detectedService = 'UI/UX Design';
      else if (lower.includes('marketing') || lower.includes('campaign')) detectedService = 'Digital Marketing';
      else if (lower.includes('web') || lower.includes('website') || lower.includes('react')) detectedService = 'Web Development';

      if (chatInput) chatInput.value = '';
      isWaitingResponse = true;
      showTypingIndicator();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: messageText,
            history: conversationHistory
          })
        });

        const data = await response.json().catch(() => ({}));
        hideTypingIndicator();

        if (response.ok && data.success && data.reply) {
          appendAssistantMessage(data.reply, data.groundingSources || []);
          conversationHistory.push({ role: 'assistant', content: data.reply });

          // Persist chat session to Firestore if authenticated
          if (window.FirebaseApp && typeof window.FirebaseApp.persistChatSessionToFirestore === 'function') {
            window.FirebaseApp.persistChatSessionToFirestore(sessionId, messageText, data.leadStatus);
          }

          // If lead qualification triggered, display handoff banner
          if (data.handoffAvailable && chatHandoffBanner) {
            chatHandoffBanner.style.display = 'flex';
            scrollChatToBottom();
          }
        } else {
          appendAssistantMessage(data.error || "I apologize, but I encountered a momentary connection issue. You can also reach Hasnain directly via the Contact Form on this page.");
        }
      } catch (err) {
        hideTypingIndicator();
        appendAssistantMessage("Network communication error. Please feel free to retry or send a message directly using the Contact Form.");
      } finally {
        isWaitingResponse = false;
      }
    };

    // Form submission
    if (chatForm) {
      chatForm.addEventListener('submit', e => {
        e.preventDefault();
        const text = chatInput ? chatInput.value.trim() : '';
        if (text) sendChatMessage(text);
      });
    }

    // Modern IME-safe enter submit
    if (chatInput) {
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
      });
    }

    // Quick chips
    $$('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (prompt) sendChatMessage(prompt);
      });
    });

    // Transfer to Contact Form feature
    if (chatTransferBtn) {
      chatTransferBtn.addEventListener('click', () => {
        closeChat();
        const contactSection = $('#contact');
        if (contactSection) {
          window.scrollTo({
            top: contactSection.getBoundingClientRect().top + window.scrollY - 78,
            behavior: 'smooth'
          });
        }

        // Pre-fill contact form inputs without submitting
        const serviceSelect = $('#contact-service');
        const messageInput = $('#contact-message');
        const nameInput = $('#contact-name');
        const alertBox = $('#formAlert');

        if (serviceSelect && detectedService) {
          const matchOption = [...serviceSelect.options].find(opt => opt.text.includes(detectedService) || opt.value.includes(detectedService));
          if (matchOption) serviceSelect.value = matchOption.value;
        }

        if (messageInput) {
          const userNotes = conversationHistory
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' | ');

          messageInput.value = userNotes
            ? `Discussion via Hasnain's Assistant:\n${userNotes}`
            : messageInput.value;
          messageInput.closest('.form-group')?.classList.add('is-valid');
        }

        if (alertBox) {
          alertBox.className = 'form-alert';
          alertBox.style.display = 'flex';
          alertBox.style.backgroundColor = 'rgba(72,199,142,0.12)';
          alertBox.style.border = '1px solid rgba(72,199,142,0.4)';
          alertBox.style.color = '#a7f3d0';
          alertBox.innerHTML = `<strong>✦ Details Transferred:</strong> Please review your contact info and project requirements below, then click <strong>SEND MESSAGE</strong>.`;
        }

        if (nameInput) {
          setTimeout(() => nameInput.focus(), 600);
        }
      });
    }
  }

  // Fetch live system health & availability status to keep badges in sync
  fetch('/api/health')
    .then(r => r.json())
    .then(data => {
      if (data && data.availability) {
        const topAvail = $('#topAvailability');
        if (topAvail) topAvail.textContent = data.availability.toUpperCase();
      }
    })
    .catch(() => {});

  // Contact image subtle scroll parallax
  const contact = $('.contact'), contactImg = $('.contact-bg img');
  const update = () => {
    if (!contactImg) return;
    const r = contact.getBoundingClientRect();
    const p = (innerHeight * .5 - (r.top + r.height * .5)) / innerHeight;
    contactImg.style.transform = `scale(1.06) translate3d(0,${Math.max(-18, Math.min(18, p * 22))}px,0)`;
  };
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();

  // Universal click feedback: links, buttons and cards get a tiny tactile pulse.
  $$('a, button, .project, .glass-contact, .tech-card, .service-line').forEach(el => {
    el.addEventListener('pointerdown', () => {
      el.classList.remove('clicking');
      void el.offsetWidth;
      el.classList.add('clicking');
      setTimeout(() => el.classList.remove('clicking'), 420);
    }, { passive: true });
  });

  // Scroll progress bar.
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  let progressRaf = false;
  addEventListener('scroll', () => {
    if (progressRaf) return;
    progressRaf = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
      progressRaf = false;
    });
  }, { passive: true });

  // 3D Space & Spatial Plexus Network Animation using Three.js
  const initHero3DAnimation = () => {
    const canvas = document.getElementById('hero-3d-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const container = canvas.parentElement;
    const scene = new THREE.Scene();

    // Create Perspective Camera
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 25;

    // Create WebGL Renderer with alpha and antialiasing
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Dynamic particles geometry
    const particleCount = window.innerWidth < 768 ? 60 : 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    // Distribute particles inside a 3D spherical volume with random velocities
    for (let i = 0; i < particleCount; i++) {
      const radius = 15;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = radius * Math.cbrt(Math.random());

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      velocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create custom particle texture (circular glowing dots with red/crimson gradient)
    const particleTexture = (() => {
      const canvasTex = document.createElement('canvas');
      canvasTex.width = 16;
      canvasTex.height = 16;
      const ctx = canvasTex.getContext('2d');
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 77, 90, 1)'); // Bright red center
      grad.addColorStop(0.3, 'rgba(227, 19, 27, 0.8)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
      return new THREE.CanvasTexture(canvasTex);
    })();

    const material = new THREE.PointsMaterial({
      size: 0.65,
      map: particleTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Create glowing 3D wireframe core (Icosahedron)
    const coreGeometry = new THREE.IcosahedronGeometry(4.5, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xe3131b,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // Create a outer geometric ring/orbit
    const ringGeometry = new THREE.TorusGeometry(8, 0.04, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8d0a10,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    scene.add(ringMesh);

    // Mouse and scroll variables for subtle interactive movement
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let scrollYOffset = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.012;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.012;
    };

    window.addEventListener('pointermove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Dynamic connections (Lines) between nearby particles
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xe3131b,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    });

    let lineSegments = null;

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Move and bounce particles
      const positionsArr = geometry.attributes.position.array;
      const linePositions = [];

      for (let i = 0; i < particleCount; i++) {
        // Apply velocity
        positionsArr[i * 3] += velocities[i].x;
        positionsArr[i * 3 + 1] += velocities[i].y;
        positionsArr[i * 3 + 2] += velocities[i].z;

        // Spherical boundary constraint
        const x = positionsArr[i * 3];
        const y = positionsArr[i * 3 + 1];
        const z = positionsArr[i * 3 + 2];
        const dist = Math.sqrt(x*x + y*y + z*z);

        if (dist > 15) {
          velocities[i].x *= -1;
          velocities[i].y *= -1;
          velocities[i].z *= -1;
        }

        // Build dynamic connection lines logic
        for (let j = i + 1; j < particleCount; j++) {
          const dx = x - positionsArr[j * 3];
          const dy = y - positionsArr[j * 3 + 1];
          const dz = z - positionsArr[j * 3 + 2];
          const d = Math.sqrt(dx*dx + dy*dy + dz*dz);

          if (d < 5) {
            linePositions.push(x, y, z);
            linePositions.push(positionsArr[j * 3], positionsArr[j * 3 + 1], positionsArr[j * 3 + 2]);
          }
        }
      }

      geometry.attributes.position.needsUpdate = true;

      // Rebuild connection lines mesh dynamically for high performance
      if (lineSegments) scene.remove(lineSegments);
      if (linePositions.length > 0) {
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lineSegments);
      }

      // Smooth camera interpolation towards mouse targets (lerp)
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Adjust camera positioning slightly based on scroll
      scrollYOffset += (window.scrollY * 0.015 - scrollYOffset) * 0.08;

      // Apply rotations
      particleSystem.rotation.y += 0.0012;
      particleSystem.rotation.x += 0.0006;
      coreMesh.rotation.y -= 0.002;
      coreMesh.rotation.x -= 0.001;
      ringMesh.rotation.z += 0.003;

      // Apply subtle mouse & scroll drift to the scene group or camera
      scene.position.x = targetX;
      scene.position.y = -targetY - scrollYOffset;

      renderer.render(scene, camera);
    };

    // Trigger WebGL fallback check
    try {
      animate();
    } catch (err) {
      console.warn("WebGL initialization failed, hiding canvas.", err);
      canvas.style.display = 'none';
    }
  };

  // 3D Services Floating Sacred Geometries using Three.js
  const initServices3DAnimation = () => {
    const canvas = document.getElementById('services-3d-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const container = canvas.parentElement;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create floating wireframe geometries
    const group = new THREE.Group();
    scene.add(group);

    const shapes = [];
    const geometries = [
      new THREE.IcosahedronGeometry(2.2, 1),
      new THREE.OctahedronGeometry(1.8, 1),
      new THREE.TorusGeometry(1.5, 0.35, 8, 24),
      new THREE.TetrahedronGeometry(1.8, 0)
    ];

    const colors = [0xe3131b, 0x8d0a10, 0xff4d5a, 0xff1e27];

    geometries.forEach((geom, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[idx % colors.length],
        wireframe: true,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geom, mat);
      
      // Distribute them evenly horizontally
      mesh.position.x = (idx - 1.5) * 7.5;
      mesh.position.y = (Math.random() - 0.5) * 3;
      mesh.position.z = (Math.random() - 0.5) * 2;
      
      mesh.userData = {
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.004 + Math.random() * 0.004,
        rotSpeedX: (Math.random() - 0.5) * 0.005,
        rotSpeedY: (Math.random() - 0.5) * 0.005,
        rotSpeedZ: (Math.random() - 0.5) * 0.005
      };

      group.add(mesh);
      shapes.push(mesh);
    });

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    window.addEventListener('pointermove', (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.006;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.006;
    }, { passive: true });

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const animate = () => {
      requestAnimationFrame(animate);

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      shapes.forEach(mesh => {
        mesh.rotation.x += mesh.userData.rotSpeedX;
        mesh.rotation.y += mesh.userData.rotSpeedY;
        mesh.rotation.z += mesh.userData.rotSpeedZ;

        mesh.userData.floatOffset += mesh.userData.floatSpeed;
        mesh.position.y += Math.sin(mesh.userData.floatOffset) * 0.006;
      });

      group.position.x = targetX * 1.2;
      group.position.y = -targetY * 1.2;

      renderer.render(scene, camera);
    };

    try {
      animate();
    } catch (err) {
      canvas.style.display = 'none';
    }
  };

  // 3D Contact Interactive Particle Vortex using Three.js
  const initContact3DAnimation = () => {
    const canvas = document.getElementById('contact-3d-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const container = canvas.parentElement;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleCount = window.innerWidth < 768 ? 140 : 320;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const waveOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 16;
      const r = (i / particleCount) * 11 + 2.5;
      const y = (Math.random() - 0.5) * 4;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);

      waveOffsets[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pTex = (() => {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 77, 90, 0.9)');
      grad.addColorStop(0.3, 'rgba(141, 10, 16, 0.55)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
      return new THREE.CanvasTexture(c);
    })();

    const material = new THREE.PointsMaterial({
      size: 0.45,
      map: pTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    window.addEventListener('pointermove', (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.005;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.005;
    }, { passive: true });

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    let clock = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      clock += 0.005;

      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += Math.sin(clock + waveOffsets[i]) * 0.005;
      }
      geometry.attributes.position.needsUpdate = true;

      particles.rotation.y += 0.0008;

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      particles.position.x = targetX * 2.5;
      particles.position.y = -targetY * 2.5;

      renderer.render(scene, camera);
    };

    try {
      animate();
    } catch (err) {
      canvas.style.display = 'none';
    }
  };

  // Initialize interactive 3D animations
  initHero3DAnimation();
  initServices3DAnimation();
  initContact3DAnimation();
});

