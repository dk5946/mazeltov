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


// =========================
// FIREBASE CONFIG
// =========================

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
    time: ["2 hr 30 min"],
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
    directions: [
      "Mix and knead until smooth.",
      "Let rise until doubled.",
      "Braid, brush with egg, and bake at 350°F until golden."
    ]
  },

  {
    id: "chicken",
    name: "Lemon herb chicken",
    category: "Mains",
    time: ["55 min"],
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
    directions: [
      "Season the chicken generously.",
      "Roast with lemon and herbs at 425°F.",
      "Rest for 10 minutes before serving."
    ]
  },

  {
    id: "cake",
    name: "Honey olive oil cake",
    category: "Sweets",
    time: ["1 hr"],
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
    directions: [
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
// ESCAPE HTML
// =========================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =========================
// FIREBASE AUTHENTICATION
// =========================

async function authenticateUser() {
  try {
    await signInAnonymously(auth);

    console.log(
      "Firebase anonymous authentication successful."
    );

  } catch (error) {
    console.error(
      "Firebase authentication failed:",
      error
    );

    throw error;
  }
}


// =========================
// LOAD RECIPES
// =========================

async function loadRecipes() {
  try {
    const snapshot = await getDocs(
      collection(db, "recipes")
    );

    recipes = snapshot.docs.map((recipeDoc) => {
      const data = recipeDoc.data();

      return {
        id: recipeDoc.id,

        name: data.name || "",

        category: data.category || "Mains",

        // Supports the newer multi-line time field (an array — one
        // entry per line, e.g. Prep / Cook / Total), but also reads
        // recipes saved before this change, which stored time as a
        // single string.
        time:
          Array.isArray(data.time)
            ? data.time
            : data.time
              ? [data.time]
              : [],

        note: data.note || "",

        from: data.from || "",

        makes: data.makes || "",

        ingredients:
          Array.isArray(data.ingredients)
            ? data.ingredients
            : [],

        // Reads the current "directions" field, but falls back to the
        // older "method" field name so recipes saved before this rename
        // still show their steps.
        directions:
          Array.isArray(data.directions)
            ? data.directions
            : Array.isArray(data.method)
              ? data.method
              : [],

        createdAt:
          data.createdAt || null
      };
    });


    // =========================
    // ADD STARTER RECIPES
    // =========================

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

  } catch (error) {

    console.error(
      "Could not load recipes:",
      error
    );

    alert(
      "Could not load recipes. Please check your Firebase Firestore setup."
    );
  }
}


// =========================
// SMART SEARCH MATCH
// Splits the query into individual words so a search
// matches regardless of word order, extra words, or
// whether the full name was typed (e.g. "herb chicken"
// or "chicken lemon" both match "Lemon herb chicken").
// =========================

function matchesSmartSearch(searchableText, query) {

  const tokens =
    query
      .split(/\s+/)
      .filter(Boolean);

  if (tokens.length === 0) {
    return true;
  }

  return tokens.every((token) =>
    searchableText.includes(token)
  );
}


// =========================
// RENDER RECIPES
// =========================

function renderRecipes() {

  const query =
    search.value.trim().toLowerCase();


  const visibleRecipes =
    recipes.filter((recipe) => {

      const matchesFilter =
        activeFilter === "All" ||
        recipe.category === activeFilter;


      const searchableText = [
        recipe.name || "",
        recipe.note || "",
        recipe.category || "",
        recipe.from || "",
        recipe.makes || "",
        ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
      ]
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        matchesSmartSearch(searchableText, query);


      return matchesFilter && matchesSearch;
    });


  const isFiltered =
    activeFilter !== "All" || query.length > 0;

  count.textContent =
    isFiltered
      ? `${visibleRecipes.length} of ${recipes.length} recipe${
          recipes.length === 1 ? "" : "s"
        }`
      : `${recipes.length} recipe${
          recipes.length === 1 ? "" : "s"
        }`;


  emptyState.hidden =
    visibleRecipes.length > 0;


  grid.innerHTML =
    visibleRecipes
      .map((recipe) => {

        const recipeId =
          escapeHtml(recipe.id);

        const recipeName =
          escapeHtml(
            recipe.name || "Untitled recipe"
          );

        const category =
          escapeHtml(
            recipe.category || "Recipe"
          );

        const note =
          escapeHtml(recipe.note || "");

        const timeList =
          Array.isArray(recipe.time)
            ? recipe.time.filter(Boolean)
            : [];

        const time =
          escapeHtml(timeList[0] || "");

        const recipeFrom =
          escapeHtml(recipe.from || "");


        return `
          <article class="recipe-card">

            <button
              class="delete-button"
              type="button"
              data-delete="${recipeId}"
              aria-label="Delete ${recipeName}"
            >
              ×
            </button>

            <div>

              <span class="card-category">
                ${category}
              </span>

              <h3>
                ${recipeName}
              </h3>

              ${
                recipeFrom
                  ? `<p class="card-from"><span class="heart">♥</span> from ${recipeFrom}</p>`
                  : ``
              }

              <p>
                ${note}
              </p>

            </div>

            <div class="card-bottom">

              ${
                time
                  ? `<span>${time}</span>`
                  : `<span></span>`
              }

              <button
                class="view-button"
                type="button"
                data-edit="${recipeId}"
              >
                Edit
              </button>

              <button
                class="view-button"
                type="button"
                data-view="${recipeId}"
              >
                View recipe ↗
              </button>

            </div>

          </article>
        `;
      })
      .join("");
}


// =========================
// FILTERS
// =========================

document
  .querySelectorAll("[data-filter]")
  .forEach((button) => {

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

    editingRecipeId = null;

    form.reset();


    const title =
      dialog.querySelector("#form-title");


    if (title) {
      title.textContent = "Add a recipe";
    }


    dialog.showModal();
  });


// =========================
// CLOSE ADD / EDIT
// =========================

document
  .querySelector("[data-close-form]")
  .addEventListener("click", () => {

    dialog.close();

    editingRecipeId = null;
  });


// =========================
// CLOSE DELETE
// =========================

document
  .querySelectorAll("[data-close-delete]")
  .forEach((button) => {

    button.addEventListener("click", () => {

      deleteDialog.close();

      deleteTargetId = null;
    });

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

    deleteTargetId =
      deleteButton.dataset.delete;


    document.querySelector(
      "#delete-confirmation"
    ).value = "";


    deleteDialog.showModal();

    return;
  }


  // =========================
  // EDIT
  // =========================

  const editButton =
    event.target.closest("[data-edit]");


  if (editButton) {

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
      Array.isArray(recipe.time)
        ? recipe.time.join("\n")
        : "";


    form.elements.note.value =
      recipe.note || "";


    if (form.elements.from) {
      form.elements.from.value =
        recipe.from || "";
    }


    if (form.elements.makes) {
      form.elements.makes.value =
        recipe.makes || "";
    }


    form.elements.ingredients.value =
      Array.isArray(recipe.ingredients)
        ? recipe.ingredients.join("\n")
        : "";


    form.elements.directions.value =
      Array.isArray(recipe.directions)
        ? recipe.directions.join("\n")
        : "";


    const title =
      dialog.querySelector("#form-title");


    if (title) {
      title.textContent = "Edit recipe";
    }


    dialog.showModal();

    return;
  }


  // =========================
  // VIEW
  // =========================

  const viewButton =
    event.target.closest("[data-view]");


  if (viewButton) {

    const recipe =
      recipes.find(
        (item) =>
          item.id === viewButton.dataset.view
      );


    if (!recipe) return;


    // CATEGORY

    const detailCategory =
      document.querySelector(
        "#detail-category"
      );

    if (detailCategory) {
      detailCategory.textContent =
        recipe.category || "Recipe";
    }


    // TITLE

    const detailTitle =
      document.querySelector(
        "#detail-title"
      );

    if (detailTitle) {
      detailTitle.textContent =
        recipe.name || "Untitled recipe";
    }


    // NOTE

    const detailNote =
      document.querySelector(
        "#detail-note"
      );

    if (detailNote) {

      detailNote.textContent =
        recipe.note || "";

      detailNote.hidden =
        !recipe.note;
    }


    // TIME

    const detailTime =
      document.querySelector(
        "#detail-time"
      );

    if (detailTime) {

      const times =
        Array.isArray(recipe.time)
          ? recipe.time.filter(Boolean)
          : [];

      detailTime.innerHTML =
        times
          .map(
            (entry) =>
              `<span>${escapeHtml(entry)}</span>`
          )
          .join("");
    }


    // INGREDIENTS

    const ingredients =
      Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];


    const ingredientCount =
      ingredients.filter(
        (item) => !item.trim().endsWith(":")
      ).length;


    const detailIngredientsCount =
      document.querySelector(
        "#detail-ingredients-count"
      );


    if (detailIngredientsCount) {

      detailIngredientsCount.textContent =
        `${ingredientCount} ingredient${
          ingredientCount === 1
            ? ""
            : "s"
        }`;
    }


    const detailIngredients =
      document.querySelector(
        "#detail-ingredients"
      );


    if (detailIngredients) {

      detailIngredients.innerHTML =
        ingredients
          .map((ingredient) => {

            const trimmed =
              ingredient.trim();

            const isHeading =
              trimmed.endsWith(":");

            return isHeading
              ? `<li class="ingredient-heading">${escapeHtml(trimmed.slice(0, -1))}</li>`
              : `<li>${escapeHtml(ingredient)}</li>`;
          })
          .join("");
    }


    // DIRECTIONS

    const directions =
      Array.isArray(recipe.directions)
        ? recipe.directions
        : [];


    const detailDirections =
      document.querySelector(
        "#detail-directions"
      );


    if (detailDirections) {

      detailDirections.innerHTML =
        directions
          .map(
            (step) =>
              `<li>${escapeHtml(step)}</li>`
          )
          .join("");
    }


    // RECIPE FROM

    const detailFrom =
      document.querySelector(
        "#detail-from"
      );


    if (detailFrom) {

      detailFrom.innerHTML =
        recipe.from
          ? `<span class="heart">♥</span> from ${escapeHtml(recipe.from)}`
          : "";

      detailFrom.hidden =
        !recipe.from;
    }


    // MAKES

    const detailMakes =
      document.querySelector(
        "#detail-makes"
      );


    if (detailMakes) {

      detailMakes.textContent =
        recipe.makes
          ? `Makes: ${recipe.makes}`
          : "";

      detailMakes.hidden =
        !recipe.makes;
    }


    // OPEN RECIPE

    detailDialog.showModal();

    return;
  }

});


// =========================
// ADD OR EDIT RECIPE
// =========================

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const data =
      new FormData(form);


    const recipeData = {

      name:
        String(
          data.get("name") || ""
        ).trim(),

      category:
        String(
          data.get("category") || "Mains"
        ).trim(),

      time:
        String(
          data.get("time") || ""
        )
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),

      note:
        String(
          data.get("note") || ""
        ).trim(),

      from:
        String(
          data.get("from") || ""
        ).trim(),

      makes:
        String(
          data.get("makes") || ""
        ).trim(),

      ingredients:
        String(
          data.get("ingredients") || ""
        )
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),

      directions:
        String(
          data.get("directions") || ""
        )
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
    };


    try {

      // =========================
      // EDIT EXISTING RECIPE
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
      // ADD NEW RECIPE
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

  }
);


// =========================
// DELETE RECIPE
// =========================

deleteForm.addEventListener(
  "submit",
  async (event) => {

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


    try {

      await deleteDoc(
        doc(
          db,
          "recipes",
          deleteTargetId
        )
      );


      lastDeletedRecipe =
        recipe;


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

  }
);


// =========================
// UNDO DELETE
// =========================

undoButton.addEventListener(
  "click",
  async () => {

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

  }
);


// =========================
// CLOSE DETAIL
// =========================

document
  .querySelectorAll("[data-close-detail]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        detailDialog.close();

      }
    );

  });


// =========================
// START RECIPE BOOK
// =========================

authenticateUser()
  .then(() => loadRecipes())
  .catch((error) => {

    console.error(
      "Could not start recipe book:",
      error
    );

    alert(
      "Could not connect to Firebase. Please check your Firebase Authentication and Firestore settings."
    );

  });
