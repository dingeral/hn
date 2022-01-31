// see https://github.com/HackerNews/API
const baseAPIUrl = 'https://hacker-news.firebaseio.com/v0';
const topStoriesAPI = `${baseAPIUrl}/topstories.json`;
const newStoriesAPI = `${baseAPIUrl}/newstories.json`;

// the length of items list
const itemsLength = 30;
const startTime = Date.now();

let isLoading = true;
let loadingTimer;

let storiesId = [];

// filtered stories
let stories = [];
// origin all fetched stories
let allStories = [];
// unqualified stories
let badStories = [];

fetchItems();

function showLoading() {
  const infoSection = document.querySelector('.info');
  infoSection.innerHTML = `Loading... ${Math.ceil((Date.now() - startTime) / 1000)}s`;
  if (isLoading) loadingTimer = setTimeout(showLoading, 1000);
}

function showError(e) {
  isLoading = false;
  clearTimeout(loadingTimer);

  console.log(e);
  const infoSection = document.querySelector('.info');
  infoSection.innerHTML = e.message;
  infoSection.style.backgroundColor = '#be3223';
}

function hideInfo() {
  isLoading = false;
  clearTimeout(loadingTimer);

  const infoSection = document.querySelector('.info');
  infoSection.style.backgroundColor = '#FFFFFF';
  infoSection.innerHTML = '';
}

function fetchItems() {
  showLoading();

  const p1 = fetch(topStoriesAPI);
  const p2 = fetch(newStoriesAPI);

  Promise.all([p1, p2])
  .then(([responseTop, responseNew]) => {
    return Promise.all([responseTop.json(), responseNew.json()]);
  })
  .then(([topStories, newStories]) => {
    storiesId.push(
      ...topStories.slice(0, itemsLength),
      ...newStories.slice(0, itemsLength)
    );
    // remove array duplicates
    storiesId = [...new Set(storiesId)];
    return Promise.all(storiesId.map(getItem));
  })
  .then(items => {
    allStories = allStories.concat(items.filter(i => i !== null));
    allStories = validateUrl(allStories);
    stories = storyFilter(allStories);
    showItems(stories);
    secondList();
    hideInfo();
  })
  .catch(e => showError);
}

function getItem(id) {
  return fetch(`${baseAPIUrl}/item/${id}.json`)
    .then(response => response.json());
}

function showItem(item, isMainList = true) {
  const li = document.createElement('li');
  const titleLine = document.createElement('p');
  // titleLine.innerHTML = item.title;
  titleLine.innerHTML = itemLine(item);
  li.appendChild(titleLine);

  let list;
  if (isMainList) {
    list = document.querySelector('.list');
  } else {
    list = document.querySelector('.second');
  }
  list.appendChild(li);
}

function showItems(items, isMainList = true) {
  for (let i = 0; i < items.length; i++) {
    showItem(items[i], isMainList);
  }
}

function itemLine(item) {
  let textArr = [];
  textArr.push(`<a href="${item.url}">${item.title}</a>`);
  textArr.push(`(${(new URL(item.url)).hostname})`);
  if (item.descendants) {
    textArr.push(`<a href="https://news.ycombinator.com/item?id=${item.id}">${item.descendants}</a>`);
  }
  return textArr.join(' ');
}

function validateUrl(items) {
  return items.map(item => {
    if (!item.url) item.url = `https://news.ycombinator.com/item?id=${item.id}`;
    return item;
  });
}

function storyFilter(items) {
  let stories = items
    .filter(hostFilter)
    .filter(keywordFilter)
    .filter(jobFilter)
    .filter(emptyStoryFilter)
    .filter(urlFilter);
  return stories;
}

function urlFilter(item) {
  const url = item.url || '';
  const screenUrls = [
    'www.nature.com/articles/s',
    'pubcard.net',
  ];
  for (let i = 0; i < screenUrls.length; i++) {
    const screenItem = screenUrls[i];
    if (url.includes(screenItem)) {
      void badStories.push(item);
      return false;
    }
  }
  return true;
}

function hostFilter(item) {
  const screenHosts = [
    'www.acm.org',
    'aeon.co',
    'americanaffairsjournal.org',
    'aws.amazon.com',
    'www.atlasobscura.com',
    'www.anandtech.com',
    'www.arxiv.org',
    'www.bloomberg.com',
    'www.cnn.com',
    'www.economist.com',
    'www.frontiersin.org',
    'www.ft.com',
    'developers.googleblog.com',
    'sec.gov',
    'leimao.github.io',
    'www.lrb.co.uk',
    'medicalxpress.com',
    'www.medrxiv.org',
    'www.nautil.us',
    'www.newscientist.com',
    'www.newyorker.com',
    'www.nih.gov',
    'www.nytimes.com',
    'paulgraham.com',
    'www.pnas.org',
    'www.pingcap.com',
    'www.preprints.org',
    'publicdomainreview.org',
    'www.quantamagazine.org',
    'www.sciencemag.org',
    'www.scmp.com',
    'seths.blog',
    'www.theatlantic.com',
    'www.vice.com',
    'www.washingtonpost.com',
    'en.wikipedia.org',
    'www.wsj.com',
    'youtu.be',
    'www.youtube.com',
  ];
  const hostStr = screenHosts.join('');

  let host;
  try {
    host = new URL(item.url).hostname;
  } catch(e) {
    return false;
  }

  if (hostStr.includes(host)) {
    void badStories.push(item);
    return false;
  }

  /*
  for (let i = 0; i < screenHosts.length; i++) {
    const screenItem = screenHosts[i];
    if (host.includes(screenItem)) {
      void badStories.push(item);
      return false;
    }
  }
  */

  return true;
}

function keywordFilter(item) {
  const screenedKeywords = [
    'coin',
    'dao',
    'blockchain',
    '\\[video\\]',
    '\\[pdf\\]',
    'Launch HN',
    'covid',
  ];
  const keywords = screenedKeywords.map(w => new RegExp(w, 'i'));
  const title = item.title || '';
  for (let i = 0; i < keywords.length; i++) {
    const regex = keywords[i];
    if (regex.test(title)) {
      void badStories.push(item);
      return false;
    }
  }
  return true;
}

function jobFilter(item) {
  if (item.type === 'job') {
    void badStories.push(item);
    return false;
  }
  return true;
}

function emptyStoryFilter(item) {
  if (
    (new URL(item.url)).hostname === 'news.ycombinator.com' &&
    item.descendants < 5
  ) {
    void badStories.push(item);
    return false;
  }
  return true;
}

function secondList() {
  if (badStories.length === 0) return;

  const second = document.querySelector('.second');

  const header = document.createElement('h2');
  header.innerHTML = 'Backup News';
  second.appendChild(header);
  showItems(badStories, false);
}

