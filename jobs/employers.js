'use strict';
function postJob() {
  const maxRoles = 10;
  open(`<p class="modal-kicker">For employers</p><h2 id="modal-title">Post opportunities</h2>
    <p>Add one role or several. Set the salary and referral bonus for each; Christopher reviews every opportunity before it goes live.</p>
    <form id="posting-form">
    <div class="form-grid posting-contact">
      <label>Your name<input name="contactName" autocomplete="name" required maxlength="120"></label>
      <label>Work email<input name="contactEmail" type="email" autocomplete="email" required maxlength="254"></label>
    </div>
    <div id="posting-roles"></div>
    <div class="add-role-row"><button class="secondary" id="add-opportunity" type="button">+ Add another opportunity</button><span class="small-note" id="posting-count" role="status"></span></div>
    <div class="form-grid posting-confirmation">
      <label class="full checkbox"><input name="consent" type="checkbox" required>I am authorized to submit these opportunities and their referral bonus terms for publication.</label>
      <label class="honeypot" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
      <div class="full"><button class="primary" id="submit-posting" type="submit">Submit opportunity for review</button><p id="posting-status" class="form-status" role="status"></p><p class="small-note">Your name and email stay private. Employers pay eligible referrers directly under the terms listed for each role.</p></div>
    </div></form>`);
  const form = $('posting-form'), container = $('posting-roles');
  const cards = () => [...container.querySelectorAll('.posting-role')];
  const options = values => values.map(value=>'<option>'+safe(value)+'</option>').join('');
  const checkboxes = (name,label,values) => '<fieldset class="full choice-group" data-options="'+name+'"><legend>'+label+'</legend><p class="field-hint">Select all that apply.</p><div class="choice-grid">'+values.map(value=>'<label class="check-option"><input type="checkbox" value="'+safe(value)+'">'+safe(value)+'</label>').join('')+'</div></fieldset>';
  const valuesFor = card => ({...Object.fromEntries([...card.querySelectorAll('[data-field]')].map(input => [input.dataset.field,input.value.trim()])),...Object.fromEntries([...card.querySelectorAll('[data-options]')].map(group=>[group.dataset.options,[...group.querySelectorAll('input:checked')].map(input=>input.value)]))});
  function updateCards() {
    const current = cards();
    current.forEach((card,index) => {
      const values = valuesFor(card);
      for(const group of card.querySelectorAll('[data-options]'))group.querySelector('input').setCustomValidity(values[group.dataset.options].length?'':'Select at least one option.');
      card.querySelector('.posting-role-title').textContent = 'Opportunity ' + (index + 1) + (values.title ? ' · ' + values.title : '');
      const amount = Number(values.bonusAmount);
      card.querySelector('.posting-role-meta').textContent = (values.salary ? 'Salary: ' + values.salary : 'Add salary') + ' · ' + (amount > 0 ? 'Referral bonus: ' + new Intl.NumberFormat('en-US',{style:'currency',currency:values.bonusCurrency,maximumFractionDigits:2}).format(amount) + ' ' + values.bonusCurrency : 'Add referral bonus');
      const remove = card.querySelector('[data-remove-role]');
      remove.hidden = current.length === 1;
      remove.setAttribute('aria-label','Remove opportunity ' + (index + 1));
    });
    $('add-opportunity').disabled = current.length >= maxRoles;
    $('posting-count').textContent = current.length + ' of ' + maxRoles + ' opportunities';
    $('submit-posting').textContent = 'Submit ' + (current.length === 1 ? 'opportunity' : current.length + ' opportunities') + ' for review';
  }
  function addOpportunity(focus = true) {
    if (cards().length >= maxRoles) return;
    const previous = cards().at(-1);
    const defaults = previous ? valuesFor(previous) : {};
    const card = document.createElement('details');
    card.className = 'posting-role'; card.dataset.id = uuid(); card.open = true;
    card.innerHTML = `<summary><span class="posting-role-title"></span><span class="posting-role-meta"></span></summary>
      <div class="posting-role-body"><div class="form-grid">
      <label class="full">Company<input data-field="company" autocomplete="organization" required maxlength="120"></label>
      ${checkboxes('categories','Company categories',COMPANY_CATEGORIES)}
      ${checkboxes('roleTypes','Role types',ROLE_TYPES)}
      <label class="full">Job title<input data-field="title" required maxlength="160" placeholder="e.g. Senior Robotics Engineer"></label>
      <label>Workplace<select data-field="location" required><option value="">Choose a workplace</option>${options(WORKPLACES)}</select></label>
      <label>Seniority<select data-field="seniority" required><option value="">Choose seniority</option><option>Internship</option><option>Early career</option><option>Experienced</option><option>Leadership</option></select></label>
      <label class="full">Salary range<input data-field="salary" required maxlength="160" placeholder="$120K–$160K USD / year"><span class="field-hint">Include currency and pay period (year or hour).</span></label>
      <label>Referral bonus<input data-field="bonusAmount" type="number" min="1" max="1000000" step="0.01" required placeholder="10000"></label>
      <label>Bonus currency<select data-field="bonusCurrency"><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option></select></label>
      <label class="full">Bonus eligibility & payout terms<textarea data-field="bonusTerms" required minlength="30" maxlength="2000" placeholder="Who qualifies, what triggers payment, when it is paid, and how duplicate or existing candidates are handled."></textarea></label>
      <label class="full">Job listing / application URL<input data-field="url" type="url" required maxlength="500" placeholder="https://"></label>
      <label class="full">About the role<textarea data-field="description" required minlength="40" maxlength="5000"></textarea></label>
      <label class="full">What you are looking for<textarea data-field="requirements" required maxlength="3000" placeholder="One requirement per line"></textarea></label>
      </div><button class="text-button remove-opportunity" type="button" data-remove-role>Remove opportunity</button></div>`;
    for (const input of card.querySelectorAll('[data-field]')) input.name = card.dataset.id + '-' + input.dataset.field;
    card.querySelector('[data-field="company"]').value=defaults.company||'';
    for(const group of card.querySelectorAll('[data-options]'))for(const input of group.querySelectorAll('input')){input.name=card.dataset.id+'-'+group.dataset.options;input.checked=group.dataset.options==='categories'&&Boolean(defaults.categories?.includes(input.value));}
    card.addEventListener('input',updateCards);
    card.addEventListener('change',updateCards);
    card.querySelector('[data-remove-role]').addEventListener('click',() => {
      if (cards().length === 1) return;
      const next = card.previousElementSibling || card.nextElementSibling;
      card.remove(); updateCards(); next.querySelector('summary').focus();
    });
    for (const existing of cards()) existing.open = false;
    container.append(card); updateCards();
    if (focus) card.querySelector('summary').focus();
  }
  $('add-opportunity').addEventListener('click',() => addOpportunity());
  // Reveal invalid fields even when their opportunity has been collapsed.
  form.addEventListener('invalid',event => {const card=event.target.closest('.posting-role');if(card)card.open=true;},true);
  addOpportunity(false);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const opportunities = cards().map(card => ({...valuesFor(card),id:card.dataset.id}));
    const payload = {contactName:form.elements.contactName.value.trim(),contactEmail:form.elements.contactEmail.value.trim(),website:form.elements.website.value,consent:form.elements.consent.checked,opportunities};
    const status = $('posting-status');
    const count = opportunities.length, noun = count === 1 ? 'opportunity' : 'opportunities';
    // Freeze the submitted draft until the request completes; retries retain each ID.
    const controls = [...form.querySelectorAll('input,select,textarea,button')];
    const disabledBefore = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    status.classList.remove('error'); status.textContent = 'Sending ' + count + ' ' + noun + '…';
    try {
      const response = await fetch(apiBase + '/jobs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to submit right now. Please try again.');
      open('<p class="modal-kicker">For employers</p><h2 id="modal-title">' + count + ' ' + noun + ' submitted.</h2><p>Your roles, salary ranges, and referral bonus terms are in Christopher’s private dashboard for review. Each opportunity will appear on the board once approved.</p><button class="primary" id="posting-done">Back to jobs</button>');
      $('posting-done').addEventListener('click',close);
    } catch(error) {
      status.textContent = error.name === 'TimeoutError' ? 'The request timed out. Your details are saved in this form; retrying will not create duplicate roles.' : error.message;
      status.classList.add('error'); controls.forEach((control,index) => {control.disabled=disabledBefore[index];});
    }
  });
}
document.addEventListener('click', event => {if(event.target.closest('[data-post-job]')) postJob();});
