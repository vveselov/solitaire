const suits = [
  { id: "spades", symbol: "♠", color: "black" },
  { id: "hearts", symbol: "♥", color: "red" },
  { id: "diamonds", symbol: "♦", color: "red" },
  { id: "clubs", symbol: "♣", color: "black" },
];

const ranks = [
  { label: "A", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
];

const state = {
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  drawCount: 1,
  dragged: null,
  selected: null,
};

const stockEl = document.querySelector("#stock");
const wasteEl = document.querySelector("#waste");
const foundationsEl = document.querySelector("#foundations");
const tableauEl = document.querySelector("#tableau");
const statusEl = document.querySelector("#status");
const newGameButton = document.querySelector("#new-game");
const drawModeButton = document.querySelector("#draw-mode");

newGameButton.addEventListener("click", newGame);
drawModeButton.addEventListener("click", () => {
  state.drawCount = state.drawCount === 1 ? 3 : 1;
  drawModeButton.textContent = `Добор: ${state.drawCount}`;
  newGame();
});
stockEl.addEventListener("click", drawFromStock);
wasteEl.addEventListener("click", () => trySelectedMove({ target: "waste", index: 0 }));

function createDeck() {
  return suits.flatMap((suit) =>
    ranks.map((rank) => ({
      id: `${rank.label}-${suit.id}`,
      suit: suit.id,
      symbol: suit.symbol,
      color: suit.color,
      rank: rank.label,
      value: rank.value,
      faceUp: false,
    })),
  );
}

function shuffle(deck) {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function newGame() {
  const deck = shuffle(createDeck());
  state.stock = [];
  state.waste = [];
  state.foundations = [[], [], [], []];
  state.tableau = [[], [], [], [], [], [], []];
  state.dragged = null;
  state.selected = null;

  for (let pileIndex = 0; pileIndex < 7; pileIndex += 1) {
    for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
      const card = deck.pop();
      card.faceUp = cardIndex === pileIndex;
      state.tableau[pileIndex].push(card);
    }
  }

  state.stock = deck;
  statusEl.textContent = "Разложите все карты по мастям от туза до короля.";
  render();
}

function drawFromStock() {
  if (state.stock.length === 0) {
    state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    state.waste = [];
    render();
    return;
  }

  const drawn = state.stock.splice(-state.drawCount).reverse();
  drawn.forEach((card) => {
    card.faceUp = true;
    state.waste.push(card);
  });
  render();
}

function render() {
  clearNode(stockEl);
  clearNode(wasteEl);
  clearNode(foundationsEl);
  clearNode(tableauEl);

  stockEl.dataset.label = state.stock.length ? "" : "↻";
  stockEl.classList.toggle("has-cards", state.stock.length > 0);

  renderWaste();
  renderFoundations();
  renderTableau();
  checkWin();
}

function renderWaste() {
  wasteEl.dataset.label = "";
  const visible = state.waste.slice(-3);
  visible.forEach((card, index) => {
    const cardEl = createCardEl(card);
    cardEl.style.left = `${index * 22}%`;
    cardEl.style.zIndex = index + 1;
    if (index === visible.length - 1) {
      makeDraggable(cardEl, { source: "waste", index: state.waste.length - 1, count: 1 });
    }
    wasteEl.append(cardEl);
  });
}

function renderFoundations() {
  state.foundations.forEach((pile, index) => {
    const pileEl = createPile("foundation", index, suits[index].symbol);
    makeDropTarget(pileEl, { target: "foundation", index });
    const topCard = pile.at(-1);
    if (topCard) {
      const cardEl = createCardEl(topCard);
      makeDraggable(cardEl, { source: "foundation", index, count: 1 });
      pileEl.append(cardEl);
    }
    foundationsEl.append(pileEl);
  });
}

function renderTableau() {
  state.tableau.forEach((pile, pileIndex) => {
    const pileEl = createPile("tableau", pileIndex, "");
    makeDropTarget(pileEl, { target: "tableau", index: pileIndex });
    pile.forEach((card, cardIndex) => {
      const cardEl = createCardEl(card);
      cardEl.style.top = `${cardIndex * (card.faceUp ? 30 : 16)}px`;
      cardEl.style.zIndex = cardIndex + 1;
      if (card.faceUp) {
        makeDraggable(cardEl, {
          source: "tableau",
          index: pileIndex,
          cardIndex,
          count: pile.length - cardIndex,
        });
      }
      pileEl.append(cardEl);
    });
    tableauEl.append(pileEl);
  });
}

function createPile(type, index, label) {
  const pileEl = document.createElement("div");
  pileEl.className = `pile ${type}`;
  pileEl.dataset.pile = type;
  pileEl.dataset.index = index;
  pileEl.dataset.label = label;
  pileEl.addEventListener("click", () => trySelectedMove({ target: type, index }));
  return pileEl;
}

function createCardEl(card) {
  const cardEl = document.createElement("div");
  cardEl.className = `card ${card.color === "red" ? "red" : ""} ${card.faceUp ? "" : "face-down"}`;
  cardEl.dataset.cardId = card.id;
  cardEl.innerHTML = card.faceUp
    ? `<span class="rank">${card.rank}</span><span class="suit">${card.symbol}</span><span class="corner">${card.rank}</span>`
    : "";
  return cardEl;
}

function makeDraggable(cardEl, payload) {
  cardEl.draggable = true;
  cardEl.classList.toggle("selected", isSamePayload(state.selected, payload));
  cardEl.addEventListener("click", (event) => {
    event.stopPropagation();
    handleCardClick(payload);
  });
  cardEl.addEventListener("dragstart", (event) => {
    state.dragged = payload;
    state.selected = null;
    cardEl.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  });
  cardEl.addEventListener("dragend", () => {
    state.dragged = null;
    document.querySelectorAll(".is-target").forEach((el) => el.classList.remove("is-target"));
    cardEl.classList.remove("dragging");
  });
  cardEl.addEventListener("dblclick", () => autoMove(payload));
}

function makeDropTarget(pileEl, target) {
  pileEl.addEventListener("dragover", (event) => {
    if (state.dragged && canMove(state.dragged, target)) {
      event.preventDefault();
      pileEl.classList.add("is-target");
    }
  });
  pileEl.addEventListener("dragleave", () => pileEl.classList.remove("is-target"));
  pileEl.addEventListener("drop", (event) => {
    event.preventDefault();
    pileEl.classList.remove("is-target");
    if (state.dragged && canMove(state.dragged, target)) {
      moveCards(state.dragged, target);
    }
  });
}

function getDraggedCards(payload) {
  if (payload.source === "waste") return [state.waste.at(-1)];
  if (payload.source === "foundation") return [state.foundations[payload.index].at(-1)];
  return state.tableau[payload.index].slice(payload.cardIndex);
}

function canMove(payload, target) {
  const moving = getDraggedCards(payload);
  const first = moving[0];
  if (!first) return false;

  if (target.target === "foundation") {
    if (moving.length !== 1) return false;
    const pile = state.foundations[target.index];
    const suit = suits[target.index].id;
    if (first.suit !== suit) return false;
    return pile.length === 0 ? first.value === 1 : first.value === pile.at(-1).value + 1;
  }

  const pile = state.tableau[target.index];
  const top = pile.at(-1);
  if (!top) return first.value === 13;
  return top.faceUp && top.color !== first.color && top.value === first.value + 1;
}

function moveCards(payload, target) {
  const moving = removeCards(payload);
  if (target.target === "foundation") {
    state.foundations[target.index].push(...moving);
  } else {
    state.tableau[target.index].push(...moving);
  }
  revealTopTableauCard(payload);
  state.selected = null;
  render();
}

function removeCards(payload) {
  if (payload.source === "waste") return state.waste.splice(-1);
  if (payload.source === "foundation") return state.foundations[payload.index].splice(-1);
  return state.tableau[payload.index].splice(payload.cardIndex);
}

function revealTopTableauCard(payload) {
  if (payload.source !== "tableau") return;
  const pile = state.tableau[payload.index];
  const top = pile.at(-1);
  if (top && !top.faceUp) top.faceUp = true;
}

function autoMove(payload) {
  const moving = getDraggedCards(payload);
  if (moving.length !== 1) return;
  const suitIndex = suits.findIndex((suit) => suit.id === moving[0].suit);
  const target = { target: "foundation", index: suitIndex };
  if (canMove(payload, target)) moveCards(payload, target);
}

function handleCardClick(payload) {
  const target = payloadToTarget(payload);
  if (state.selected && target && canMove(state.selected, target)) {
    moveCards(state.selected, target);
    return;
  }
  state.selected = isSamePayload(state.selected, payload) ? null : payload;
  render();
}

function trySelectedMove(target) {
  if (!state.selected || target.target === "waste") return;
  if (canMove(state.selected, target)) moveCards(state.selected, target);
}

function payloadToTarget(payload) {
  if (payload.source === "waste") return null;
  return {
    target: payload.source === "foundation" ? "foundation" : "tableau",
    index: payload.index,
  };
}

function isSamePayload(left, right) {
  return Boolean(
    left &&
      right &&
      left.source === right.source &&
      left.index === right.index &&
      left.cardIndex === right.cardIndex,
  );
}

function checkWin() {
  const completed = state.foundations.every((pile) => pile.length === 13);
  if (completed) statusEl.textContent = "Победа! Все карты собраны по мастям.";
}

function clearNode(node) {
  while (node.firstChild) node.firstChild.remove();
}

newGame();
