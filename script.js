const storageKey = 'bentzy-esti-recipes';
const starterRecipes = [
  { id: 'challah', name: 'Friday night challah', category: 'Bakes', time: '2 hr 30 min', note: 'Golden, soft, and made for tearing into while it is still warm.', ingredients: ['4 cups flour', '2 tsp instant yeast', '1 cup warm water', '2 eggs', '2 tbsp honey', '1 tsp salt'], method: ['Mix and knead until smooth.', 'Let rise until doubled.', 'Braid, brush with egg, and bake at 350°F until golden.'] },
  { id: 'chicken', name: 'Lemon herb chicken', category: 'Mains', time: '55 min', note: 'A bright, easy dinner with crisp edges and plenty of pan juices.', ingredients: ['4 chicken thighs', '1 lemon', '2 garlic cloves', 'Fresh herbs', 'Olive oil'], method: ['Season the chicken generously.', 'Roast with lemon and herbs at 425°F.', 'Rest for 10 minutes before serving.'] },
  { id: 'cake', name: 'Honey olive oil cake', category: 'Sweets', time: '1 hr', note: 'Tender and fragrant, with just the right amount of sweetness.', ingredients: ['1 1/2 cups flour', '3/4 cup olive oil', '1/2 cup honey', '3 eggs', 'Orange zest'], method: ['Whisk wet ingredients together.', 'Fold in flour and zest.', 'Bake at 350°F until golden and springy.'] }
];
let recipes = JSON.parse(localStorage.getItem(storageKey) || 'null') || starterRecipes;
let activeFilter = 'All';
const grid = document.querySelector('#recipe-grid');
const search = document.querySelector('#recipe-search');
const emptyState = document.querySelector('#empty-state');
const count = document.querySelector('#recipe-count');
const dialog = document.querySelector('#recipe-dialog');
const form = document.querySelector('#recipe-form');
function saveRecipes() { localStorage.setItem(storageKey, JSON.stringify(recipes)); }
function renderRecipes() {
  const query = search.value.trim().toLowerCase();
  const visibleRecipes = recipes.filter((recipe) => {
    const matchesFilter = activeFilter === 'All' || recipe.category === activeFilter;
    const matchesSearch = `${recipe.name} ${recipe.note} ${recipe.category}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  count.textContent = `${recipes.length} recipe${recipes.length === 1 ? '' : 's'}`;
  emptyState.hidden = visibleRecipes.length > 0;
  grid.innerHTML = visibleRecipes.map((recipe) => `<article class="recipe-card"><button class="delete-button" type="button" data-delete="${recipe.id}" aria-label="Delete ${recipe.name}">×</button><div><span class="card-category">${recipe.category}</span><h3>${recipe.name}</h3><p>${recipe.note}</p></div><div class="card-bottom"><span>${recipe.time}</span><button class="view-button" type="button" data-view="${recipe.id}">View recipe ↗</button></div></article>`).join('');
}
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button)); renderRecipes(); }));
search.addEventListener('input', renderRecipes);
document.querySelector('[data-open-form]').addEventListener('click', () => dialog.showModal());
document.querySelector('[data-close-form]').addEventListener('click', () => dialog.close());
grid.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) { recipes = recipes.filter((recipe) => recipe.id !== deleteButton.dataset.delete); saveRecipes(); renderRecipes(); return; }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { const recipe = recipes.find((item) => item.id === viewButton.dataset.view); alert(`${recipe.name}\n\nIngredients\n${recipe.ingredients.join('\n')}\n\nMethod\n${recipe.method.join('\n')}`); }
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  recipes.unshift({ id: `recipe-${Date.now()}`, name: data.get('name'), category: data.get('category'), time: data.get('time'), note: data.get('note'), ingredients: data.get('ingredients').split('\n').filter(Boolean), method: data.get('method').split('\n').filter(Boolean) });
  saveRecipes(); form.reset(); dialog.close(); activeFilter = 'All'; document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item.dataset.filter === 'All')); renderRecipes();
});
renderRecipes();
