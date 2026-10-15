'use strict';
const $ = id => document.getElementById(id);
const apiBase = 'https://personal-site-metrics.i3l-anonymous.workers.dev';
const endpoint = apiBase + '/referrals';
const COMPANY_CATEGORIES = ['SaaS','Industrials','Space','Defense','Robotics'];
const ROLE_TYPES = ['Software Engineer','Electrical Engineer','Mechanical Engineer','Robotics Engineer','Business Development','Marketing','Open Roles'];
const WORKPLACES = ['On-site','Remote'];
const FILTER_FIELDS = ['seniority','location'];
const MULTI_FILTERS = {category:'categories',roleType:'roleTypes'};
function addOptions(id,values) {
  for (const value of values) {const option=document.createElement('option');option.value=value;option.textContent=value;$(id).append(option);}
}

addOptions('location',WORKPLACES);
let jobs = [], opener;
const uuid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe = value => escape(value);
function initCheckFilter(id,values,allLabel) {
  const menu=$(id);
  menu.querySelector('.filter-options').innerHTML=values.map(value=>'<label class="check-option"><input type="checkbox" value="'+safe(value)+'">'+safe(value)+'</label>').join('');
  menu.dataset.allLabel=allLabel;
  menu.addEventListener('change',()=>{updateFilterLabel(id);render();});
}
const selectedFilter=id=>[...$(id).querySelectorAll('input:checked')].map(input=>input.value);
function updateFilterLabel(id) {const selected=selectedFilter(id);$(id).querySelector('summary').textContent=selected.length===0?$(id).dataset.allLabel:selected.length===1?selected[0]:selected.length+' selected';}
initCheckFilter('category',COMPANY_CATEGORIES,'All categories');
initCheckFilter('roleType',ROLE_TYPES,'All roles');
document.addEventListener('click',event=>{for(const id of Object.keys(MULTI_FILTERS))if(!$(id).contains(event.target))$(id).open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const id of Object.keys(MULTI_FILTERS))if($(id).open){$(id).open=false;$(id).querySelector('summary').focus();}});
const bonusLabel = job => job.bonus ? new Intl.NumberFormat('en-US',{style:'currency',currency:job.bonus.currency,notation:'compact',maximumFractionDigits:2}).format(job.bonus.amount) + ' ' + job.bonus.currency : 'Bonus to be confirmed';
const bonusSummary = job => job ? '<p class="modal-bonus">' + safe(job.bonus ? bonusLabel(job) + ' referral bonus' : 'Referral bonus to be confirmed') + '</p>' : '';
const bonusTerms = job => job?.bonus ? '<details class="bonus-terms"><summary>Referral bonus terms</summary><p>' + safe(job.bonus.terms) + '</p></details>' : '';
function notify(message) { $('toast').textContent = message; $('toast').hidden = false; setTimeout(() => { $('toast').hidden = true; }, 2600); }
function open(content, updateHash) {
  opener = document.activeElement;
  $('modal-content').innerHTML = content;
  if (!$('modal').open) $('modal').showModal();
  $('modal').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  if (updateHash) history.replaceState(null, '', '#' + updateHash);
}
function close() {
  $('modal').close();
  document.body.style.overflow = '';
  if (location.hash.startsWith('#role=')) history.replaceState(null, '', location.pathname + location.search);
  if (opener?.isConnected) opener.focus();
}
$('close-modal').addEventListener('click', close);
$('modal').addEventListener('cancel', e => { e.preventDefault(); close(); });
$('modal').addEventListener('click', e => { if (e.target === $('modal')) { const r = $('modal').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } });
function role(id) {
  const job = jobs.find(j => j.id === id); if (!job) return;
  open(bonusSummary(job) + '<p class="modal-kicker">' + safe(job.company) + ' · ' + safe(job.location) + '</p><h2 id="modal-title">' + safe(job.title) + '</h2><div class="pill-row">' + [job.categories.join(', '), job.seniority, job.salary ? 'Salary: ' + job.salary : 'Salary: not listed'].map(s => '<span class="pill">' + safe(s) + '</span>').join('') + '</div><p>' + safe(job.description) + '</p><ul>' + job.requirements.map(s => '<li>' + safe(s) + '</li>').join('') + '</ul>' + bonusTerms(job) + '<div class="actions"><button class="primary" data-refer="' + safe(id) + '">Refer someone</button><button class="secondary" data-apply="' + safe(id) + '">I’m interested</button><button class="secondary" id="share-role">Share referral link</button></div>', roleHash(id));
  $('share-role').addEventListener('click', () => shareReferral(id));
}
function render() {
  const filtered = jobs.filter(j => Object.entries(MULTI_FILTERS).every(([id,key])=>{const selected=selectedFilter(id);return !selected.length||selected.some(value=>j[key].includes(value));}) && FILTER_FIELDS.every(k => !$(k).value || j[k] === $(k).value));
  filtered.sort((a,b) => a.company.localeCompare(b.company,undefined,{sensitivity:'base'}) || a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));
  $('result-count').textContent = filtered.length + (filtered.length === 1 ? ' opportunity' : ' opportunities');
  $('jobs').innerHTML = filtered.map(j => '<button class="job" data-role="' + safe(j.id) + '"><span><h3>' + safe(j.title) + '</h3><span class="meta">' + safe(j.company) + ' · ' + safe(j.location) + '</span></span><span class="compensation"><span class="pay pay-bonus"><small>Referral bonus</small><strong>' + safe(bonusLabel(j)) + '</strong></span><span class="pay"><small>Salary</small><strong>' + safe(j.salary || 'Not listed') + '</strong></span></span></button>').join('');
  $('empty').hidden = filtered.length !== 0;
}
const panels = {
how:'<p class="modal-kicker">How it works</p><h2 id="modal-title">Three ways to take part.</h2><ol class="steps"><li><strong>Employers: post a role.</strong>Set the referral bonus, eligibility, and payout timing. Christopher reviews your submission before publishing it.</li><li><strong>Job seekers: find your next team.</strong>Explore roles and put yourself forward. A shared referral link connects your application to its referrer.</li><li><strong>Referrers: introduce someone great.</strong>Share your personal referral link, or introduce someone with their permission. Employers pay the listed bonus when its conditions are met.</li></ol><p class="small-note">Each role has its own bonus terms. A referral or self-application alone does not qualify for payment. Employers pay eligible referrers directly under the listed terms. Luey does not collect or distribute bonus payments.</p><div class="actions"><button class="primary" data-post-job>Post a job</button><button class="secondary" data-refer="">Refer someone</button></div>',
about:'<p class="modal-kicker">The person behind the board</p><h2 id="modal-title">Hi, I’m Christopher.</h2><p>I work across robotics, industrials, and defense—as an engineer, investor, and someone who loves connecting good people.</p><p>I’ve worked at Tesla, Astranis, and Innate Robotics, and conducted robotics research at MIT and Stanford. I have more than 500 coffee chats annually. This board is another way to put those conversations to work.</p><div class="actions"><a class="primary" href="../" target="_blank" rel="noopener">More about me ↗</a><a class="secondary" href="https://cal.com/christopher-luey" target="_blank" rel="noopener noreferrer">Let’s chat ↗</a></div>',
privacy:'<p class="modal-kicker">Your details</p><h2 id="modal-title">Privacy</h2><p>Referral forms collect each person’s name and at least one contact method: email, phone number, or both. They also collect an optional professional profile and your note. Referral links store the referrer’s name and contact details privately; only a random identifier appears in the shared URL. Applications through a link are associated with that referrer. This browser remembers only the links you create, not your contact details. Only share another person’s details with their permission.</p><p>Employer forms collect the contact name and email, role details, and bonus terms. Approved role details and bonus terms are public; contact names and emails stay private.</p><p>Submissions are stored in a private Cloudflare database for Christopher Luey to review and follow up on. Candidate details are not published or automatically forwarded to employers. Bonus terms are saved with each referral for reference. No résumé upload is required.</p><p>A temporary daily hash is used to limit spam; the application does not store raw IP addresses. This page uses no advertising cookies. Records remain until Christopher removes them.</p><p>For access, corrections, or deletion, email <a href="mailto:luey@alumni.stanford.edu">luey@alumni.stanford.edu</a>.</p>'
};
document.addEventListener('click', e => {
  const apply = e.target.closest('[data-apply]'); if (apply) return referral(apply.dataset.apply,true);
  const ref = e.target.closest('[data-refer]'); if (ref) return referral(ref.dataset.refer);
  const job = e.target.closest('[data-role]'); if (job) return role(job.dataset.role);
  const panel = e.target.closest('[data-dialog]'); if (panel && panels[panel.dataset.dialog]) open(panels[panel.dataset.dialog]);
});
FILTER_FIELDS.forEach(id => $(id).addEventListener('change', render));
$('clear-filters').addEventListener('click', () => { FILTER_FIELDS.forEach(id => $(id).value = ''); for(const id of Object.keys(MULTI_FILTERS)){for(const input of $(id).querySelectorAll('input'))input.checked=false;updateFilterLabel(id);} render(); });
Promise.allSettled([fetch('jobs.json?v=checkbox-contact-8').then(r=>{if(!r.ok)throw new Error();return r.json();}),fetch(apiBase+'/jobs').then(r=>{if(!r.ok)throw new Error();return r.json();})]).then(results => {
  if(results.every(r=>r.status==='rejected')) throw new Error();
  jobs=results.flatMap(r=>r.status==='fulfilled'?r.value.jobs:[]).map(job=>({...job,categories:job.categories?.length?job.categories:[job.category],roleTypes:job.roleTypes?.length?job.roleTypes:[job.roleType]}));
  if(results[1].status==='rejected') $('board-note').textContent='Employer postings could not be loaded. Showing curated roles only; refresh to retry.';
  addOptions('seniority',[...new Set(jobs.map(j => j.seniority))].filter(Boolean).sort());
  render();
  followJobLink();
}).catch(() => { $('result-count').textContent = 'Unable to load roles'; $('jobs').innerHTML = '<p class="empty">Please refresh, or <a href="mailto:luey@alumni.stanford.edu">contact Christopher</a>.</p>'; });
window.addEventListener('hashchange', followJobLink);
