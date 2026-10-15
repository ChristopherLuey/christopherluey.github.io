'use strict';
function referral(id = '', self = false) {
  const referralId = uuid();
  const selectedJob=jobs.find(job=>job.id===id);
  const contactFields = (prefix, title) => `<fieldset class="full contact-group" id="${prefix}-contact"><legend>${title} <span>Email or phone</span></legend><div class="form-grid contact-fields">
    <label class="contact-name">Name<input name="${prefix}Name" required maxlength="120" ${prefix==='your'?'autocomplete="name"':''}></label>
    <label>Email<input name="${prefix}Email" type="email" maxlength="254" ${prefix==='your'?'autocomplete="email"':''}></label>
    <label>Phone<input name="${prefix}Phone" type="tel" maxlength="40" ${prefix==='your'?'autocomplete="tel"':''}></label>
    </div></fieldset>`;
  open(`<div class="referral-panel"><div class="referral-heading"><div id="referral-bonus"></div><h2 id="modal-title">Refer someone</h2>${selectedJob?'<p class="selected-role">'+safe(selectedJob.company+' · '+selectedJob.title)+'</p>':''}</div>
    <form id="referral-form"><div class="form-grid">
    ${selectedJob?'<input type="hidden" name="role" value="'+safe(selectedJob.id)+'">':'<label class="full">Opportunity<select name="role" required><option value="open">Open introduction</option>'+jobs.map(j=>'<option value="'+safe(j.id)+'">'+safe(j.company+' · '+j.title)+'</option>').join('')+'</select></label>'}
    <label class="full checkbox" ${selectedJob?'hidden':''}><input name="self" type="checkbox" id="self">I’m referring myself</label>
    ${contactFields('your','You')}
    ${contactFields('candidate','Candidate')}
    <label class="full"><span id="referral-message-label">Why a good fit?</span><textarea name="message" required minlength="20" maxlength="2000" rows="2" placeholder="A brief note on experience and fit."></textarea></label>
    <details class="full optional-profile"><summary>Add a profile link <span>(optional)</span></summary><label><span class="sr-only">Profile link</span><input name="profile" type="url" placeholder="LinkedIn, GitHub, or portfolio URL" maxlength="500"></label></details>
    <p class="full small-note" id="link-attribution" hidden>Linked to the person who shared this job.</p><div class="full" id="referral-terms"></div>
    <label class="full checkbox"><input name="consent" type="checkbox" required><span id="referral-consent">I have permission to share these details with Christopher.</span></label>
    <label class="honeypot" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
    <div class="full referral-submit"><button class="primary" type="submit" id="submit-referral">Send referral</button><button type="button" class="text-button" id="form-privacy">Privacy</button></div><p id="form-status" class="full form-status" role="status"></p>
    </div></form></div>`);
  const form=$('referral-form');
  function validateContacts() {
    for(const prefix of ['your','candidate']) {
      const address=form.elements[prefix+'Email'],phone=form.elements[prefix+'Phone'];
      const number=phone.value.trim(),digits=number.replace(/\D/g,'').length;
      const ignored=prefix==='candidate'&&$('self').checked;
      address.setCustomValidity(!ignored&&!address.value.trim()&&!number?'Enter an email or phone number for this person.':'');
      phone.setCustomValidity(!ignored&&number&&(!/^\+?[0-9().\s-]+$/.test(number)||digits<7||digits>15)?'Enter a valid phone number with 7–15 digits; include the country code if outside the US.':'');
    }
  }
  function toggleSelf() {
    const own=$('self').checked;
    $('modal-title').textContent=own?'Apply':'Refer someone';
    $('submit-referral').textContent=own?'Apply':'Send referral';
    $('referral-consent').textContent=own?'I agree to share my details with Christopher.':'I have permission to share these details with Christopher.';
    $('candidate-contact').hidden=own;$('candidate-contact').disabled=own;
    updateAttribution();validateContacts();
  }
  function updateAttribution() {$('link-attribution').hidden=!$('self').checked||!referralContext.has(form.elements.role.value);}
  $('self').checked=self;$('self').addEventListener('change',toggleSelf);toggleSelf();
  form.addEventListener('input',validateContacts);
  form.addEventListener('invalid',event=>{const details=event.target.closest('details');if(details)details.open=true;},true);
  const updateBonus=()=>{const job=jobs.find(j=>j.id===form.elements.role.value);$('referral-bonus').innerHTML=bonusSummary(job);$('referral-bonus').hidden=!job;$('referral-terms').innerHTML=bonusTerms(job);$('referral-terms').hidden=!job?.bonus;};
  form.elements.role.addEventListener('change',()=>{updateBonus();updateAttribution();});updateBonus();
  $('form-privacy').addEventListener('click',()=>notify('Contact details stay private for referral review. Request deletion: luey@alumni.stanford.edu'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();validateContacts();if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));
    const payload={...values,id:referralId,consent:values.consent==='on',self:values.self==='on'};
    if(payload.self&&referralContext.has(payload.role))payload.referralLink=referralContext.get(payload.role)||'invalid';
    if(payload.self){payload.candidateName=payload.yourName;payload.candidateEmail=payload.yourEmail;payload.candidatePhone=payload.yourPhone;}
    const status=$('form-status'),button=$('submit-referral');button.disabled=true;status.classList.remove('error');status.textContent='Sending…';
    try {
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
      if(!response.ok){const info=await response.json().catch(()=>({}));throw new Error(info.error||'Unable to send right now. Please try again.');}
      open('<h2 id="modal-title">Received.</h2><p>Sent to Christopher for review.</p><div class="actions"><button class="primary" id="done">Back to jobs</button><button class="secondary" data-refer="">Refer someone else</button></div>');
      $('done').addEventListener('click',close);
    }catch(error){status.textContent=error.message+' You can also email luey@alumni.stanford.edu.';status.classList.add('error');button.disabled=false;}
  });
}
