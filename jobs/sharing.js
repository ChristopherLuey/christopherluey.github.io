'use strict';
const referralContext = new Map();
const shareKey = 'luey-job-referral-links';
const validLinkId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function savedShare(id) {
  try { const value=JSON.parse(localStorage.getItem(shareKey)||'{}')[id];return validLinkId(value)?value:''; } catch { return ''; }
}
function saveShare(id, token) {
  try { const saved=JSON.parse(localStorage.getItem(shareKey)||'{}');localStorage.setItem(shareKey,JSON.stringify({...saved,[id]:token})); } catch {}
}
function roleHash(id) {
  const params=new URLSearchParams({role:id});
  if(referralContext.has(id))params.set('ref',referralContext.get(id));
  return params.toString();
}
function followJobLink() {
  const params=new URLSearchParams(location.hash.slice(1)),id=params.get('role');
  if(!id)return;
  if(params.has('ref'))referralContext.set(id,params.get('ref'));else referralContext.delete(id);
  if(jobs.some(job=>job.id===id))role(id);
  else open('<h2 id="modal-title">Role unavailable</h2><p>This job is no longer on the board. Contact the person who shared it for an update.</p>');
}
function referralUrl(id, token) {
  const url=new URL(location.href);
  // A localhost link would point at the recipient's own device.
  if(['localhost','127.0.0.1'].includes(url.hostname))url.hostname='100.83.140.110';
  url.search='';url.hash=new URLSearchParams({role:id,ref:token}).toString();
  return url.href;
}
async function copyReferralLink() {
  const field=$('share-url'),button=$('copy-share'),status=$('share-status');
  let copied=false;
  try {
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(field.value);copied=true;}
  } catch {}
  if(!copied){field.focus();field.select();field.setSelectionRange(0,field.value.length);try{copied=document.execCommand('copy');}catch{}}
  button.textContent=copied?'Copied!':'Copy link';
  status.textContent=copied?'Link copied. Ready to send.':'The link is selected. Use Copy or press Ctrl+C (⌘C on Mac).';
}
function showShareLink(job, token) {
  const url=referralUrl(job.id,token);
  open(bonusSummary(job)+`<h2 id="modal-title">Your referral link</h2><p class="selected-role">${safe(job.company+' · '+job.title)}</p><p>Send this to someone who’d be a great fit. Their application will identify you as the referrer.</p><div class="form-grid"><label class="full">Link to share<input id="share-url" type="url" value="${safe(url)}" readonly></label></div><div class="actions"><button class="primary" id="copy-share">Copy link</button>${navigator.share?'<button class="secondary" id="native-share">Share…</button>':''}<button class="text-button" id="change-sharer">Use different details</button></div><p class="form-status" id="share-status" role="status"></p><p class="small-note">Your contact details stay private. The employer’s bonus terms still apply.</p>`);
  $('share-url').addEventListener('click',event=>event.target.select());
  $('copy-share').addEventListener('click',copyReferralLink);
  $('change-sharer').addEventListener('click',()=>shareReferral(job.id,true));
  if($('native-share'))$('native-share').addEventListener('click',async()=>{try{await navigator.share({title:job.company+' · '+job.title,text:'Thought this role might be a great fit for you.',url});}catch(error){if(error.name!=='AbortError')$('share-status').textContent='Use Copy link to share it.';}});
}
function shareReferral(id, fresh=false) {
  const job=jobs.find(job=>job.id===id);if(!job)return;
  const saved=savedShare(id);if(saved&&!fresh)return showShareLink(job,saved);
  const linkId=uuid();
  open(bonusSummary(job)+`<h2 id="modal-title">Share as a referrer</h2><p class="selected-role">${safe(job.company+' · '+job.title)}</p><p>Add your details once to create a personal referral link.</p><form id="share-form"><div class="form-grid">
    <label class="full">Your name<input name="yourName" autocomplete="name" required maxlength="120"></label>
    <label>Your email<input name="yourEmail" type="email" autocomplete="email" maxlength="254"></label>
    <label>Your phone<input name="yourPhone" type="tel" autocomplete="tel" maxlength="40"></label>
    <p class="full small-note">Email or phone required. Only Christopher can see your contact details.</p>
    <label class="full checkbox"><input type="checkbox" name="consent" required>I agree to share my details with Christopher for referral attribution.</label>
    <label class="honeypot" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
    <div class="full"><button class="primary" id="create-share" type="submit">Create referral link</button><p class="form-status" id="share-status" role="status"></p></div>
    </div></form>`);
  const form=$('share-form');
  const validate=()=>{
    const email=form.elements.yourEmail,phone=form.elements.yourPhone,number=phone.value.trim(),digits=number.replace(/\D/g,'').length;
    email.setCustomValidity(!email.value.trim()&&!number?'Enter an email or phone number.':'');
    phone.setCustomValidity(number&&(!/^\+?[0-9().\s-]+$/.test(number)||digits<7||digits>15)?'Enter a valid phone number with 7–15 digits.':'');
  };
  form.addEventListener('input',validate);
  form.addEventListener('submit',async event=>{
    event.preventDefault();validate();if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form)),status=$('share-status'),button=$('create-share');
    button.disabled=true;status.classList.remove('error');status.textContent='Creating link…';
    try {
      const response=await fetch(apiBase+'/referral-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,id:linkId,role:id,consent:values.consent==='on'}),signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not create a link. Please try again.');
      if(!validLinkId(data.id)||data.role!==id)throw new Error('Could not create a link. Please try again.');
      saveShare(id,data.id);showShareLink(job,data.id);
    }catch(error){status.textContent=error.message;status.classList.add('error');button.disabled=false;}
  });
}
