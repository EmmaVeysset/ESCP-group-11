const priceTests = {
  '1.79': { acceptance: 61.7, channels: { dtc: [0.77, 55.3], gym: [0.81, 56.7], retail: [0.40, 39.2] } },
  '2.19': { acceptance: 51.7, channels: { dtc: [1.16, 65.1], gym: [1.13, 64.6], retail: [0.63, 50.3] } },
  '2.59': { acceptance: 26.7, channels: { dtc: [1.54, 71.4], gym: [1.45, 70.1], retail: [0.86, 58.0] } }
};

const marketing = [
  ['Influencer / content', 37.32, 100.82, 2.70], ['Paid social', 45.55, 132.13, 2.90],
  ['Referral / subscription', 28.11, 81.39, 2.90], ['Retail sampling', 60.63, 174.17, 2.87]
];
const seasons = [78, 80, 88, 98, 118, 132, 138, 128, 104, 90, 82, 84];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const keys = ['dtc', 'gym', 'retail'];
const labels = { dtc: 'DTC online', gym: 'Gym & office', retail: 'Retail / grocery' };
const money = n => `€${n.toFixed(2)}`;

function renderStatic() {
  document.querySelector('#marketingRows').innerHTML = marketing.map(row => `<tr><td>${row[0]}</td><td>${money(row[1])}</td><td>${money(row[2])}</td><td>${row[3].toFixed(2)}:1</td></tr>`).join('');
  document.querySelector('#seasonality').innerHTML = seasons.map((value, index) => `<div class="season"><i style="height:${value / 1.45}%"></i><span>${months[index]}</span></div>`).join('');
}

function render() {
  const selected = priceTests[document.querySelector('#price').value];
  const mix = Object.fromEntries(keys.map(key => [key, Number(document.querySelector(`#${key}`).value)]));
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  keys.forEach(key => document.querySelector(`#${key}Out`).textContent = `${mix[key]}%`);
  const valid = total === 100;
  const hint = document.querySelector('#mixHint');
  hint.textContent = valid ? 'Mix totals 100%.' : `Mix totals ${total}%. Adjust the sliders to 100% to calculate a scenario.`;
  hint.classList.toggle('warning', !valid);
  if (!valid) return;
  const weighted = keys.reduce((sum, key) => sum + selected.channels[key][0] * mix[key] / 100, 0);
  const weightedMargin = keys.reduce((sum, key) => sum + selected.channels[key][1] * mix[key] / 100, 0);
  const averageCAC = marketing.reduce((sum, row) => sum + row[1], 0) / marketing.length;
  document.querySelector('#acceptance').textContent = `${selected.acceptance}%`;
  document.querySelector('#contribution').textContent = money(weighted);
  document.querySelector('#recommendedMargin').textContent = money(weighted);
  document.querySelector('#margin').textContent = `${weightedMargin.toFixed(1)}%`;
  document.querySelector('#payback').textContent = Math.ceil(averageCAC / weighted);
  document.querySelector('#channelBars').innerHTML = keys.map(key => {
    const [contribution] = selected.channels[key];
    return `<div class="bar-row"><span>${labels[key]}</span><div><i style="width:${contribution / 1.54 * 100}%"></i></div><b>${money(contribution)}</b></div>`;
  }).join('');
}

renderStatic();
document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', render));
render();
