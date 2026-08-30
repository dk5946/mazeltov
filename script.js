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

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


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

const storage = getStorage(app);


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
    ],
    tags: ["Parve", "Shabbos"],
    photoUrl: ""
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
    ],
    tags: ["Parve"],
    photoUrl: ""
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
    ],
    tags: ["Parve", "Pesach"],
    photoUrl: ""
  }
];


// =========================
// VARIABLES
// =========================

let recipes = [];

let activeFilter = "All";

let activeTags = new Set();

let sortBy = "newest";

let lastDeletedRecipe = null;

let undoTimeoutId = null;

let deleteTargetId = null;

let editingRecipeId = null;

let editingPhotoUrl = "";

let formIsDirty = false;

let currentDetailRecipe = null;


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
          data.createdAt || null,

        tags:
          Array.isArray(data.tags)
            ? data.tags
            : [],

        photoUrl:
          data.photoUrl || ""
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

    grid.innerHTML =
      `<p class="loading-state">Couldn't load recipes — check your Firebase Firestore setup.</p>`;

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
// INGREDIENT SCALING
// Reads a leading quantity off an ingredient line (a
// whole number, decimal, fraction, or mixed number),
// so it can be multiplied for the servings scaler.
// Section headings and lines with no leading number
// (e.g. "Salt to taste") are left untouched.
// =========================

function parseLeadingQuantity(line) {

  const vulgarFractions = {
    "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3,
    "¼": 1 / 4, "¾": 3 / 4,
    "⅕": 1 / 5, "⅖": 2 / 5, "⅗": 3 / 5, "⅘": 4 / 5,
    "⅙": 1 / 6, "⅚": 5 / 6,
    "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8
  };

  const unicodeMixedMatch =
    line.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);

  if (unicodeMixedMatch) {
    const whole = parseInt(unicodeMixedMatch[1], 10);

    return {
      value: whole + vulgarFractions[unicodeMixedMatch[2]],
      matchLength: unicodeMixedMatch[0].length
    };
  }

  const unicodeFractionMatch =
    line.match(/^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);

  if (unicodeFractionMatch) {
    return {
      value: vulgarFractions[unicodeFractionMatch[1]],
      matchLength: unicodeFractionMatch[0].length
    };
  }

  const mixedMatch =
    line.match(/^(\d+)\s+(\d+)\/(\d+)/);

  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);

    return {
      value: whole + (num / den),
      matchLength: mixedMatch[0].length
    };
  }

  const fractionMatch =
    line.match(/^(\d+)\/(\d+)/);

  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);

    return {
      value: num / den,
      matchLength: fractionMatch[0].length
    };
  }

  const numberMatch =
    line.match(/^(\d+(?:\.\d+)?)/);

  if (numberMatch) {
    return {
      value: parseFloat(numberMatch[1]),
      matchLength: numberMatch[0].length
    };
  }

  return null;
}

function formatQuantity(num) {

  const rounded =
    Math.round(num * 100) / 100;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  const knownFractions = [
    [0.25, "1/4"],
    [0.33, "1/3"],
    [0.5, "1/2"],
    [0.67, "2/3"],
    [0.75, "3/4"]
  ];

  for (const [decimal, label] of knownFractions) {
    if (Math.abs(frac - decimal) < 0.02) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  return String(rounded);
}

function renderIngredientsList(recipe, scale) {

  const ingredients =
    Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];

  const list =
    document.querySelector("#detail-ingredients");

  if (!list) return;

  list.innerHTML =
    ingredients
      .map((line) => {

        const trimmed = line.trim();
        const isHeading = trimmed.endsWith(":");

        if (isHeading) {
          return `<li class="ingredient-heading">${escapeHtml(trimmed.slice(0, -1))}</li>`;
        }

        if (scale === 1) {
          return `<li>${escapeHtml(line)}</li>`;
        }

        const parsed = parseLeadingQuantity(line);

        if (!parsed) {
          return `<li>${escapeHtml(line)}</li>`;
        }

        const scaledLine =
          formatQuantity(parsed.value * scale) +
          line.slice(parsed.matchLength);

        return `<li>${escapeHtml(scaledLine)}</li>`;
      })
      .join("");
}


// =========================
// COOK TIME (FOR SORTING)
// Roughly estimates total minutes from the first time
// entry (e.g. "2 hr 30 min", "45 min") so recipes can
// be sorted quickest-first. Unparseable or missing
// times sort to the end.
// =========================

function estimateMinutes(recipe) {

  const first =
    Array.isArray(recipe.time) ? recipe.time[0] : null;

  if (!first) return Infinity;

  const hourMatch =
    first.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/i);

  const minuteMatch =
    first.match(/(\d+(?:\.\d+)?)\s*min/i);

  if (!hourMatch && !minuteMatch) {

    const bareNumber =
      first.match(/(\d+(?:\.\d+)?)/);

    return bareNumber
      ? parseFloat(bareNumber[1])
      : Infinity;
  }

  let minutes = 0;

  if (hourMatch) minutes += parseFloat(hourMatch[1]) * 60;
  if (minuteMatch) minutes += parseFloat(minuteMatch[1]);

  return minutes;
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


      const recipeTags =
        Array.isArray(recipe.tags) ? recipe.tags : [];

      const matchesTags =
        activeTags.size === 0 ||
        recipeTags.some((tag) => activeTags.has(tag));


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


      return matchesFilter && matchesTags && matchesSearch;
    });


  if (sortBy === "az") {

    visibleRecipes.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

  } else if (sortBy === "time") {

    visibleRecipes.sort((a, b) =>
      estimateMinutes(a) - estimateMinutes(b)
    );

  } else {

    visibleRecipes.sort((a, b) =>
      (b.createdAt || 0) - (a.createdAt || 0)
    );
  }


  const isFiltered =
    activeFilter !== "All" ||
    activeTags.size > 0 ||
    query.length > 0;

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

        const recipeFrom =
          escapeHtml(recipe.from || "");

        const recipeTags =
          Array.isArray(recipe.tags)
            ? recipe.tags
            : [];


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

            ${
              recipe.photoUrl
                ? `<img class="card-photo" src="${escapeHtml(recipe.photoUrl)}" alt="">`
                : ``
            }

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

              ${
                recipeTags.length
                  ? `<div class="card-tags">${recipeTags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}</div>`
                  : ``
              }

            </div>

            <div class="card-bottom">

              ${
                timeList.length
                  ? `<div class="card-times">${timeList.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}</div>`
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
// TAG FILTERS
// Multi-select — clicking a tag toggles it on or off;
// a recipe matches if it has any of the selected tags.
// =========================

document
  .querySelectorAll("[data-tag-filter]")
  .forEach((button) => {

    button.addEventListener("click", () => {

      const tag =
        button.dataset.tagFilter;

      if (activeTags.has(tag)) {
        activeTags.delete(tag);
      } else {
        activeTags.add(tag);
      }

      button.classList.toggle(
        "is-active",
        activeTags.has(tag)
      );

      renderRecipes();
    });

  });


// =========================
// SORT
// =========================

const sortSelect =
  document.querySelector("#recipe-sort");

if (sortSelect) {

  sortSelect.addEventListener("change", () => {

    sortBy = sortSelect.value;

    renderRecipes();
  });
}


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

    editingPhotoUrl = "";

    form.reset();

    formIsDirty = false;


    const currentPhotoWrap =
      document.querySelector("#current-photo-wrap");

    if (currentPhotoWrap) {
      currentPhotoWrap.hidden = true;
    }


    const title =
      dialog.querySelector("#form-title");


    if (title) {
      title.textContent = "Add a recipe";
    }


    dialog.showModal();
  });


// =========================
// TRACK UNSAVED CHANGES
// =========================

form.addEventListener("input", () => {
  formIsDirty = true;
});

function confirmDiscardIfDirty() {
  return (
    !formIsDirty ||
    confirm("Discard your changes to this recipe?")
  );
}


// =========================
// CLOSE ADD / EDIT
// =========================

document
  .querySelector("[data-close-form]")
  .addEventListener("click", () => {

    if (!confirmDiscardIfDirty()) {
      return;
    }

    dialog.close();

    editingRecipeId = null;

    formIsDirty = false;
  });

dialog.addEventListener("cancel", (event) => {

  if (!confirmDiscardIfDirty()) {
    event.preventDefault();
    return;
  }

  editingRecipeId = null;

  formIsDirty = false;
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


    form
      .querySelectorAll('input[name="tags"]')
      .forEach((checkbox) => {

        checkbox.checked =
          Array.isArray(recipe.tags) &&
          recipe.tags.includes(checkbox.value);
      });


    editingPhotoUrl =
      recipe.photoUrl || "";

    const currentPhotoWrap =
      document.querySelector("#current-photo-wrap");

    const currentPhotoPreview =
      document.querySelector("#current-photo-preview");

    if (currentPhotoWrap && currentPhotoPreview) {

      if (editingPhotoUrl) {
        currentPhotoPreview.src = editingPhotoUrl;
        currentPhotoWrap.hidden = false;
      } else {
        currentPhotoWrap.hidden = true;
      }
    }

    if (form.elements.removePhoto) {
      form.elements.removePhoto.checked = false;
    }


    formIsDirty = false;


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


    currentDetailRecipe = recipe;


    // PHOTO

    const detailPhoto =
      document.querySelector(
        "#detail-photo"
      );

    if (detailPhoto) {

      if (recipe.photoUrl) {
        detailPhoto.src = recipe.photoUrl;
        detailPhoto.alt = recipe.name || "";
        detailPhoto.hidden = false;
      } else {
        detailPhoto.hidden = true;
        detailPhoto.src = "";
      }
    }


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
      renderIngredientsList(recipe, 1);
    }

    document
      .querySelectorAll(".scale-button")
      .forEach((button) => {

        button.classList.toggle(
          "is-active",
          button.dataset.scale === "1"
        );
      });


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


    // TAGS

    const detailTags =
      document.querySelector(
        "#detail-tags"
      );

    if (detailTags) {

      const tags =
        Array.isArray(recipe.tags)
          ? recipe.tags
          : [];

      detailTags.innerHTML =
        tags
          .map(
            (tag) =>
              `<span>${escapeHtml(tag)}</span>`
          )
          .join("");
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
          .filter(Boolean),

      tags:
        Array.from(
          form.querySelectorAll('input[name="tags"]:checked')
        ).map((checkbox) => checkbox.value)
    };


    try {

      // =========================
      // PHOTO UPLOAD / REMOVAL
      // =========================

      const photoFile =
        form.elements.photo &&
        form.elements.photo.files[0];

      const removePhoto =
        form.elements.removePhoto &&
        form.elements.removePhoto.checked;

      let photoUrl =
        removePhoto ? "" : editingPhotoUrl;

      if (photoFile) {

        const photoRef =
          ref(
            storage,
            `recipe-photos/${Date.now()}-${photoFile.name}`
          );

        await uploadBytes(photoRef, photoFile);

        photoUrl = await getDownloadURL(photoRef);
      }

      recipeData.photoUrl = photoUrl;


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

      editingPhotoUrl = "";

      formIsDirty = false;

      form.reset();

      dialog.close();


      const currentPhotoWrap =
        document.querySelector("#current-photo-wrap");

      if (currentPhotoWrap) {
        currentPhotoWrap.hidden = true;
      }


      activeFilter = "All";

      activeTags.clear();


      document
        .querySelectorAll("[data-filter]")
        .forEach((item) => {

          item.classList.toggle(
            "is-active",
            item.dataset.filter === "All"
          );

        });

      document
        .querySelectorAll("[data-tag-filter]")
        .forEach((item) => {

          item.classList.remove("is-active");
        });


      renderRecipes();


    } catch (error) {

      console.error(
        "Could not save recipe:",
        error
      );


      alert(
        "Could not save the recipe. Please check your Firebase Firestore and Storage setup."
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
      confirmation.value.trim().toUpperCase() !==
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

      clearTimeout(undoTimeoutId);

      undoTimeoutId = setTimeout(() => {

        undoBar.hidden = true;

        lastDeletedRecipe = null;
      }, 8000);


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

    clearTimeout(undoTimeoutId);


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
// SERVINGS SCALER
// =========================

document
  .querySelectorAll(".scale-button")
  .forEach((button) => {

    button.addEventListener("click", () => {

      if (!currentDetailRecipe) return;

      const scale =
        parseFloat(button.dataset.scale);

      document
        .querySelectorAll(".scale-button")
        .forEach((item) => {

          item.classList.toggle(
            "is-active",
            item === button
          );
        });

      renderIngredientsList(currentDetailRecipe, scale);
    });

  });


// =========================
// PRINT RECIPE
// =========================

const printButton =
  document.querySelector("#print-recipe");

if (printButton) {

  printButton.addEventListener("click", () => {
    window.print();
  });
}


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
