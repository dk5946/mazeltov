// =========================
// FIREBASE
// =========================

import {
initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getFirestore,
collection,
getDocs,
addDoc,
updateDoc,
deleteDoc,
doc,
setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
getAuth,
signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
apiKey: "AIzaSyB-O44tJ1GELJWcyX1n59bhL_37otV97u0",
authDomain: "recipes-a5f0a.firebaseapp.com",
projectId: "recipes-a5f0a",
storageBucket: "recipes-a5f0a.firebasestorage.app",
messagingSenderId: "346241111599",
appId: "1:346241111599:web:f9a9d3ef05d7857d1e58da",
measurementId: "G-J0PDKTRQWB"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

// =========================
// INVITE AUTHENTICATION
// =========================

const inviteToken =
"13d7c9ecd2b24f8fa3d4ce5b83cc8354";

const hasValidInvite =
window.location.hash === `#invite=${inviteToken}` ||
sessionStorage.getItem("recipeInviteAuthenticated") === "true";

if (hasValidInvite) {

document.body.classList.add("is-authenticated");

sessionStorage.setItem(
"recipeInviteAuthenticated",
"true"
);

}

// =========================
// STARTER RECIPES
// =========================

const starterRecipes = [

{
id: "challah",
name: "Friday night challah",
category: "Bakes",
time: "2 hr 30 min",
note: "Golden, soft, and made for tearing into while it is still warm.",
from: "",
makes: "",
ingredients: [
"4 cups flour",
"2 tsp instant yeast",
"1 cup warm water",
"2 eggs",
"2 tbsp honey",
"1 tsp salt"
],
method: [
"Mix and knead until smooth.",
"Let rise until doubled.",
"Braid, brush with egg, and bake at 350°F until golden."
]
},

{
id: "chicken",
name: "Lemon herb chicken",
category: "Mains",
time: "55 min",
note: "A bright, easy dinner with crisp edges and plenty of pan juices.",
from: "",
makes: "",
ingredients: [
"4 chicken thighs",
"1 lemon",
"2 garlic cloves",
"Fresh herbs",
"Olive oil"
],
method: [
"Season the chicken generously.",
"Roast with lemon and herbs at 425°F.",
"Rest for 10 minutes before serving."
]
},

{
id: "cake",
name: "Honey olive oil cake",
category: "Sweets",
time: "1 hr",
note: "Tender and fragrant, with just the right amount of sweetness.",
from: "",
makes: "",
ingredients: [
"1 1/2 cups flour",
"3/4 cup olive oil",
"1/2 cup honey",
"3 eggs",
"Orange zest"
],
method: [
"Whisk wet ingredients together.",
"Fold in flour and zest.",
"Bake at 350°F until golden and springy."
]
}

];

// =========================
// VARIABLES
// =========================

let recipes = [];

let activeFilter = "All";

let lastDeletedRecipe = null;

let deleteTargetId = null;

let editingRecipeId = null;

// =========================
// ELEMENTS
// =========================

const grid =
document.querySelector("#recipe-grid");

const search =
document.querySelector("#recipe-search");

const emptyState =
document.querySelector("#empty-state");

const count =
document.querySelector("#recipe-count");

const dialog =
document.querySelector("#recipe-dialog");

const form =
document.querySelector("#recipe-form");

const deleteDialog =
document.querySelector("#delete-dialog");

const deleteForm =
document.querySelector("#delete-form");

const undoBar =
document.querySelector("#undo-bar");

const undoMessage =
document.querySelector("#undo-message");

const undoButton =
document.querySelector("#undo-delete");

const detailDialog =
document.querySelector("#detail-dialog");

// =========================
// FIREBASE AUTH
// =========================

async function authenticateUser() {

try {

```
await signInAnonymously(auth);

console.log("Firebase anonymous authentication successful.");
```

} catch (error) {

```
console.error(
  "Firebase authentication failed:",
  error
);

throw error;
```

}

}

// =========================
// LOAD RECIPES
// =========================

async function loadRecipes() {

try {

```
const snapshot =
  await getDocs(
    collection(db, "recipes")
  );


recipes = snapshot.docs.map((recipeDoc) => ({

  id: recipeDoc.id,

  ...recipeDoc.data(),

  ingredients:
    Array.isArray(recipeDoc.data().ingredients)
      ? recipeDoc.data().ingredients
      : [],

  method:
    Array.isArray(recipeDoc.data().method)
      ? recipeDoc.data().method
      : []

}));


// Add starter recipes if database is empty

if (recipes.length === 0) {

  for (const recipe of starterRecipes) {

    await setDoc(
      doc(db, "recipes", recipe.id),
      recipe
    );

  }

  recipes = [...starterRecipes];

}


renderRecipes();
```

} catch (error) {

```
console.error(
  "Could not load recipes:",
  error
);

alert(
  "Could not load recipes. Please check your Firebase Firestore setup."
);
```

}

}

// =========================
// RENDER RECIPES
// =========================

function renderRecipes() {

const query =
search.value.trim().toLowerCase();

const visibleRecipes =
recipes.filter((recipe) => {

```
  const matchesFilter =
    activeFilter === "All" ||
    recipe.category === activeFilter;


  const searchableText = [

    recipe.name || "",

    recipe.note || "",

    recipe.category || "",

    recipe.from || "",

    recipe.makes || ""

  ]
    .join(" ")
    .toLowerCase();


  const matchesSearch =
    searchableText.includes(query);


  return matchesFilter && matchesSearch;

});
```

count.textContent =
`${recipes.length} recipe${recipes.length === 1 ? "" : "s"}`;

emptyState.hidden =
visibleRecipes.length > 0;

grid.innerHTML =
visibleRecipes.map((recipe) => `

```
  <article class="recipe-card">

    <button
      class="delete-button"
      type="button"
      data-delete="${recipe.id}"
      aria-label="Delete ${escapeHtml(recipe.name || "recipe")}"
    >
      ×
    </button>

    <div>

      <span class="card-category">
        ${escapeHtml(recipe.category || "Recipe")}
      </span>

      <h3>
        ${escapeHtml(recipe.name || "Untitled recipe")}
      </h3>

      <p>
        ${escapeHtml(recipe.note || "")}
      </p>

    </div>

    <div class="card-bottom">

      <span>
        ${escapeHtml(recipe.time || "")}
      </span>

      <button
        class="view-button"
        type="button"
        data-view="${recipe.id}"
      >
        View recipe ↗
      </button>

      <button
        class="view-button"
        type="button"
        data-edit="${recipe.id}"
      >
        Edit
      </button>

    </div>

  </article>

`).join("");
```

}

// =========================
// ESCAPE HTML
// =========================

function escapeHtml(value) {

return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");

}

// =========================
// FILTERS
// =========================

document
.querySelectorAll("[data-filter]")
.forEach((button) => {

```
button.addEventListener("click", () => {

  activeFilter =
    button.dataset.filter;


  document
    .querySelectorAll("[data-filter]")
    .forEach((item) => {

      item.classList.toggle(
        "is-active",
        item === button
      );

    });


  renderRecipes();

});
```

});

// =========================
// SEARCH
// =========================

search.addEventListener(
"input",
renderRecipes
);

// =========================
// OPEN ADD RECIPE
// =========================

document
.querySelector("[data-open-form]")
.addEventListener("click", () => {

```
editingRecipeId = null;

form.reset();


const title =
  dialog.querySelector("#form-title");


if (title) {

  title.textContent =
    "Add a recipe";

}


dialog.showModal();
```

});

// =========================
// CLOSE ADD / EDIT
// =========================

document
.querySelector("[data-close-form]")
.addEventListener("click", () => {

```
dialog.close();

editingRecipeId = null;
```

});

// =========================
// CLOSE DELETE
// =========================

document
.querySelectorAll("[data-close-delete]")
.forEach((button) => {

```
button.addEventListener("click", () => {

  deleteDialog.close();

  deleteTargetId = null;

});
```

});

// =========================
// RECIPE CARD BUTTONS
// =========================

grid.addEventListener("click", (event) => {

// =========================
// DELETE
// =========================

const deleteButton =
event.target.closest("[data-delete]");

if (deleteButton) {

```
deleteTargetId =
  deleteButton.dataset.delete;


document.querySelector(
  "#delete-confirmation"
).value = "";


deleteDialog.showModal();

return;
```

}

// =========================
// EDIT
// =========================

const editButton =
event.target.closest("[data-edit]");

if (editButton) {

```
const recipe =
  recipes.find(
    (item) =>
      item.id === editButton.dataset.edit
  );


if (!recipe) return;


editingRecipeId =
  recipe.id;


form.elements.name.value =
  recipe.name || "";


form.elements.category.value =
  recipe.category || "Mains";


form.elements.time.value =
  recipe.time || "";


form.elements.note.value =
  recipe.note || "";


form.elements.from.value =
  recipe.from || "";


form.elements.makes.value =
  recipe.makes || "";


form.elements.ingredients.value =
  Array.isArray(recipe.ingredients)
    ? recipe.ingredients.join("\n")
    : "";


form.elements.method.value =
  Array.isArray(recipe.method)
    ? recipe.method.join("\n")
    : "";


const title =
  dialog.querySelector("#form-title");


if (title) {

  title.textContent =
    "Edit recipe";

}


dialog.showModal();

return;
```

}

// =========================
// VIEW
// =========================

const viewButton =
event.target.closest("[data-view]");

if (viewButton) {

```
const recipe =
  recipes.find(
    (item) =>
      item.id === viewButton.dataset.view
  );


if (!recipe) return;


// Category

document.querySelector(
  "#detail-category"
).textContent =
  recipe.category || "Recipe";


// Title

document.querySelector(
  "#detail-title"
).textContent =
  recipe.name || "";


// Note

const detailNote =
  document.querySelector(
    "#detail-note"
  );


detailNote.textContent =
  recipe.note || "";


detailNote.hidden =
  !recipe.note;


// Time

const detailTime =
  document.querySelector(
    "#detail-time"
  );


detailTime.textContent =
  recipe.time
    ? `Time: ${recipe.time}`
    : "";


detailTime.hidden =
  !recipe.time;


// Ingredient count

const ingredients =
  Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];


const detailIngredientsCount =
  document.querySelector(
    "#detail-ingredients-count"
  );


detailIngredientsCount.textContent =
  `${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}`;


// Makes

const detailMakes =
  document.querySelector(
    "#detail-makes"
  );


detailMakes.textContent =
  recipe.makes
    ? `Makes: ${recipe.makes}`
    : "";


detailMakes.hidden =
  !recipe.makes;


// Recipe from

const detailFrom =
  document.querySelector(
    "#detail-from"
  );


detailFrom.textContent =
  recipe.from
    ? `From: ${recipe.from}`
    : "";


detailFrom.hidden =
  !recipe.from;


// Ingredients

document.querySelector(
  "#detail-ingredients"
).innerHTML =
  ingredients
    .map(
      (ingredient) =>
        `<li>${escapeHtml(ingredient)}</li>`
    )
    .join("");


// Directions
// IMPORTANT:
// HTML uses #detail-directions

const method =
  Array.isArray(recipe.method)
    ? recipe.method
    : [];


document.querySelector(
  "#detail-directions"
).innerHTML =
  method
    .map(
      (step) =>
        `<li>${escapeHtml(step)}</li>`
    )
    .join("");


detailDialog.showModal();
```

}

});

// =========================
// ADD OR EDIT RECIPE
// =========================

form.addEventListener(
"submit",
async (event) => {

```
event.preventDefault();


const data =
  new FormData(form);


const recipeData = {

  name:
    String(data.get("name") || "").trim(),

  category:
    String(data.get("category") || "Mains").trim(),

  time:
    String(data.get("time") || "").trim(),

  note:
    String(data.get("note") || "").trim(),

  from:
    String(data.get("from") || "").trim(),

  makes:
    String(data.get("makes") || "").trim(),

  ingredients:
    String(data.get("ingredients") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),

  method:
    String(data.get("method") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)

};


try {


  // =========================
  // EDIT
  // =========================

  if (editingRecipeId) {

    await updateDoc(
      doc(
        db,
        "recipes",
        editingRecipeId
      ),
      recipeData
    );


    recipes =
      recipes.map((recipe) =>
        recipe.id === editingRecipeId
          ? {
              id: editingRecipeId,
              ...recipeData
            }
          : recipe
      );

  }


  // =========================
  // ADD
  // =========================

  else {

    const newRecipe = {

      ...recipeData,

      createdAt: Date.now()

    };


    const newDoc =
      await addDoc(
        collection(db, "recipes"),
        newRecipe
      );


    recipes.unshift({

      id: newDoc.id,

      ...newRecipe

    });

  }


  editingRecipeId = null;

  form.reset();

  dialog.close();

  activeFilter = "All";


  document
    .querySelectorAll("[data-filter]")
    .forEach((item) => {

      item.classList.toggle(
        "is-active",
        item.dataset.filter === "All"
      );

    });


  renderRecipes();


} catch (error) {

  console.error(
    "Could not save recipe:",
    error
  );


  alert(
    "Could not save the recipe. Please check your Firebase Firestore setup."
  );

}
```

}
);

// =========================
// DELETE RECIPE
// =========================

deleteForm.addEventListener(
"submit",
async (event) => {

```
event.preventDefault();


const confirmation =
  document.querySelector(
    "#delete-confirmation"
  );


if (
  confirmation.value.trim() !==
  "DELETE"
) {

  return;

}


const recipe =
  recipes.find(
    (item) =>
      item.id === deleteTargetId
  );


if (!recipe) return;


lastDeletedRecipe =
  recipe;


try {

  await deleteDoc(
    doc(
      db,
      "recipes",
      deleteTargetId
    )
  );


  recipes =
    recipes.filter(
      (recipe) =>
        recipe.id !== deleteTargetId
    );


  deleteTargetId = null;


  undoMessage.textContent =
    `${lastDeletedRecipe.name} deleted.`;


  undoBar.hidden = false;


  deleteDialog.close();


  renderRecipes();


} catch (error) {

  console.error(
    "Could not delete recipe:",
    error
  );


  alert(
    "Could not delete the recipe."
  );

}
```

}
);

// =========================
// UNDO DELETE
// =========================

undoButton.addEventListener(
"click",
async () => {

```
if (!lastDeletedRecipe) return;


try {

  await setDoc(
    doc(
      db,
      "recipes",
      lastDeletedRecipe.id
    ),
    lastDeletedRecipe
  );


  recipes.unshift(
    lastDeletedRecipe
  );


  lastDeletedRecipe = null;

  undoBar.hidden = true;


  renderRecipes();


} catch (error) {

  console.error(
    "Could not restore recipe:",
    error
  );


  alert(
    "Could not restore the recipe."
  );

}
```

}
);

// =========================
// CLOSE DETAIL
// =========================

document
.querySelectorAll("[data-close-detail]")
.forEach((button) => {

```
button.addEventListener(
  "click",
  () => {

    detailDialog.close();

  }
);
```

});

// =========================
// START
// =========================

authenticateUser()
.then(() => loadRecipes())
.catch((error) => {

```
console.error(
  "Could not start recipe book:",
  error
);
```

});
