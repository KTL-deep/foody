document.addEventListener("DOMContentLoaded", () => {
    // --- State ---
    let dishes = [];
    let orders = [];
    let users = [];
    let currentUser = null;
    let currentCategory = "all";

    // --- Helper: Local Date YYYY-MM-DD ---
    function getLocalDateString(offsetDays = 0) {
        const d = new Date();
        if (offsetDays !== 0) {
            d.setDate(d.getDate() + offsetDays);
        }
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    }

    // --- DOM Elements ---
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const dishesContainer = document.getElementById("dishes-container");

    // Theme Toggle
    const themeToggleBtn = document.getElementById("theme-toggle");

    // Menu Controls
    const menuSearchInput = document.getElementById("menu-search");
    const menuSortSelect = document.getElementById("menu-sort");
    const showArchivedCheckbox = document.getElementById("show-archived");

    // Order Modal Elements
    const orderModal = document.getElementById("order-modal");
    const orderForm = document.getElementById("order-form");
    const orderDishIdInput = document.getElementById("order-dish-id");
    const orderDishNameInput = document.getElementById("order-dish-name");
    const orderDateInput = document.getElementById("order-date");
    const closeOrderModalBtn = document.getElementById("close-order-modal");

    // Recipe Modal Elements
    const recipeModal = document.getElementById("recipe-modal");
    const recipeTitle = document.getElementById("recipe-title");
    const recipeKbju = document.getElementById("recipe-kbju");
    const recipeInstructions = document.getElementById("recipe-instructions");
    const closeRecipeModalBtn = document.getElementById("close-recipe-modal");

    // Edit Dish Modal Elements
    const editDishModal = document.getElementById("edit-dish-modal");
    const editDishForm = document.getElementById("edit-dish-form");
    const editDishIdInput = document.getElementById("edit-dish-id");
    const editDishNameInput = document.getElementById("edit-dish-name");
    const editDishCategorySelect = document.getElementById("edit-dish-category");
    const editDishTimeInput = document.getElementById("edit-dish-time");
    const editDishDescTextarea = document.getElementById("edit-dish-desc");
    const editDishRecipeTextarea = document.getElementById("edit-dish-recipe");
    const editDishIngredientsTextarea = document.getElementById("edit-dish-ingredients");
    const editDishImageHidden = document.getElementById("edit-dish-image");
    const editDishCaloriesInput = document.getElementById("edit-dish-calories");
    const editDishProteinsInput = document.getElementById("edit-dish-proteins");
    const editDishFatsInput = document.getElementById("edit-dish-fats");
    const editDishCarbsInput = document.getElementById("edit-dish-carbs");
    const closeEditDishModalBtn = document.getElementById("close-edit-dish-modal");

    // Add Dish Elements
    const addDishForm = document.getElementById("add-dish-form");
    const cameraInput = document.getElementById("camera-input");
    const editCameraInput = document.getElementById("edit-camera-input");

    // Profile Elements
    const userSelect = document.getElementById("user-select");
    const userStatsContainer = document.getElementById("user-stats-container");
    const userTargetsForm = document.getElementById("user-targets-form");

    // Grocery List Elements
    const groceryStartInput = document.getElementById("grocery-start");
    const groceryEndInput = document.getElementById("grocery-end");
    const generateGroceryBtn = document.getElementById("generate-grocery-btn");
    const groceryResult = document.getElementById("grocery-result");
    const groceryItemsList = document.getElementById("grocery-items");

    // KBJU Summary Elements
    const summaryDateInput = document.getElementById("summary-date");
    const kbjuSummaryGrid = document.getElementById("kbju-summary-grid");

    // Orders Lists & Badges
    const pendingOrdersContainer = document.getElementById("orders-pending-container");
    const acceptedOrdersContainer = document.getElementById("orders-accepted-container");
    const completedOrdersContainer = document.getElementById("orders-completed-container");
    const pendingBadge = document.getElementById("pending-orders-badge");
    const countPendingEl = document.getElementById("count-pending");
    const countAcceptedEl = document.getElementById("count-accepted");
    const countCompletedEl = document.getElementById("count-completed");

    // Toast
    const toast = document.getElementById("toast-notification");

    // Set Default Dates
    summaryDateInput.value = getLocalDateString(0); // Today
    groceryStartInput.value = getLocalDateString(0);
    groceryEndInput.value = getLocalDateString(7);

    // --- Helper: Toast Notification ---
    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.add("active");
        setTimeout(() => {
            toast.classList.remove("active");
        }, duration);
    }

    // --- Theme Toggle ---
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        const newTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });

    // --- Tab Switcher ---
    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");
            navButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(tab => tab.classList.remove("active"));
            button.classList.add("active");
            document.getElementById(targetTab).classList.add("active");

            if (targetTab === "menu-tab") fetchDishes();
            else if (targetTab === "orders-tab") fetchOrders();
            else if (targetTab === "profile-tab") fetchUsers();
        });
    });

    // --- Photo Upload Logic ---
    async function handleFileUpload(file, previewId, statusId, hiddenInputId) {
        const formData = new FormData();
        formData.append("file", file);
        
        document.getElementById(statusId).textContent = "Загрузка...";
        
        try {
            const response = await fetch("/api/upload-photo", {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            document.getElementById(hiddenInputId).value = data.image_url;
            document.getElementById(statusId).textContent = "Готово ✅";
            
            const preview = document.getElementById(previewId);
            preview.querySelector("img").src = data.image_url;
            preview.style.display = "block";
        } catch (error) {
            console.error(error);
            document.getElementById(statusId).textContent = "Ошибка ❌";
        }
    }

    cameraInput.addEventListener("change", (e) => {
        if (e.target.files[0]) {
            handleFileUpload(e.target.files[0], "photo-preview", "photo-status", "dish-image");
        }
    });

    editCameraInput.addEventListener("change", (e) => {
        if (e.target.files[0]) {
            handleFileUpload(e.target.files[0], "edit-photo-preview", "edit-photo-status", "edit-dish-image");
        }
    });

    // --- User Management ---
    async function fetchUsers() {
        try {
            const response = await fetch("/api/users");
            users = await response.json();
            renderUserSelect();
            if (users.length > 0 && !currentUser) {
                currentUser = users[0];
                userSelect.value = currentUser.id;
                fetchUserStats();
            }
        } catch (error) {
            console.error(error);
        }
    }

    function renderUserSelect() {
        userSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join("");
        if (currentUser) userSelect.value = currentUser.id;
    }

    userSelect.addEventListener("change", (e) => {
        currentUser = users.find(u => u.id == e.target.value);
        fetchUserStats();
    });

    async function fetchUserStats() {
        if (!currentUser) return;
        try {
            const response = await fetch(`/api/users/${currentUser.id}/stats`);
            const stats = await response.json();
            renderUserStats(stats);
            // Fill target form
            document.getElementById("target-calories").value = stats.targets.target_calories;
            document.getElementById("target-proteins").value = stats.targets.target_proteins;
            document.getElementById("target-fats").value = stats.targets.target_fats;
            document.getElementById("target-carbs").value = stats.targets.target_carbs;
        } catch (error) {
            console.error(error);
        }
    }

    function renderUserStats(stats) {
        const p = (val, target) => Math.min(100, (val / target) * 100);
        userStatsContainer.innerHTML = `
            <div class="user-stats-card">
                <h3>Привет, ${stats.user_name}! 🍳</h3>
                <p>Твой прогресс за сегодня (по съеденным блюдам):</p>
                
                <div class="stat-row">
                    <span>Калории: ${Math.round(stats.consumed.calories)} / ${stats.targets.target_calories} ккал</span>
                    <div class="progress-bar"><div style="width: ${p(stats.consumed.calories, stats.targets.target_calories)}%"></div></div>
                </div>
                
                <div class="nutrients-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
                    <div class="nutr-item" style="text-align: center; background: var(--border-cozy); padding: 10px; border-radius: 8px;">
                        <small>Белки</small><br>
                        <strong>${stats.consumed.proteins.toFixed(1)} / ${stats.targets.target_proteins}г</strong>
                    </div>
                    <div class="nutr-item" style="text-align: center; background: var(--border-cozy); padding: 10px; border-radius: 8px;">
                        <small>Жиры</small><br>
                        <strong>${stats.consumed.fats.toFixed(1)} / ${stats.targets.target_fats}г</strong>
                    </div>
                    <div class="nutr-item" style="text-align: center; background: var(--border-cozy); padding: 10px; border-radius: 8px;">
                        <small>Углеводы</small><br>
                        <strong>${stats.consumed.carbs.toFixed(1)} / ${stats.targets.target_carbs}г</strong>
                    </div>
                </div>
            </div>
        `;
    }

    userTargetsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const data = {
            target_calories: parseFloat(document.getElementById("target-calories").value),
            target_proteins: parseFloat(document.getElementById("target-proteins").value),
            target_fats: parseFloat(document.getElementById("target-fats").value),
            target_carbs: parseFloat(document.getElementById("target-carbs").value)
        };
        try {
            await fetch(`/api/users/${currentUser.id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });
            showToast("Цели обновлены! 💪");
            fetchUserStats();
        } catch (error) {
            showToast("Ошибка при обновлении целей");
        }
    });

    // --- Grocery List ---
    generateGroceryBtn.addEventListener("click", async () => {
        const start = groceryStartInput.value;
        const end = groceryEndInput.value;
        try {
            const response = await fetch(`/api/grocery-list?start_date=${start}&end_date=${end}`);
            const data = await response.json();
            renderGroceryList(data.grocery_list);
        } catch (error) {
            showToast("Ошибка при генерации списка");
        }
    });

    function renderGroceryList(items) {
        groceryItemsList.innerHTML = items.map(item => `
            <li style="list-style: none; margin-bottom: 8px;">
                <label style="cursor: pointer;">
                    <input type="checkbox" style="margin-right: 10px;"> ${item}
                </label>
            </li>
        `).join("");
        groceryResult.style.display = "block";
    }

    // --- Existing Functionality Updates ---
    
    // API: Fetch Dishes
    async function fetchDishes() {
        try {
            const includeArchived = showArchivedCheckbox.checked;
            const response = await fetch(`/api/dishes?include_archived=${includeArchived}`);
            dishes = await response.json();
            renderDishes();
        } catch (error) {
            showToast("Ошибка загрузки меню 🍳");
        }
    }

    function renderDishes() {
        dishesContainer.innerHTML = "";
        let filtered = currentCategory === "all" ? dishes : dishes.filter(d => d.category === currentCategory);
        
        const searchQuery = menuSearchInput.value.toLowerCase().trim();
        if (searchQuery) {
            filtered = filtered.filter(d => d.name.toLowerCase().includes(searchQuery) || (d.ingredients && d.ingredients.toLowerCase().includes(searchQuery)));
        }

        filtered.forEach(dish => {
            const imgUrl = dish.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&auto=format&fit=crop&q=60";
            const card = document.createElement("div");
            card.className = `dish-card${dish.is_archived ? ' archived' : ''}`;
            card.innerHTML = `
                <div class="dish-img-container">
                    <img class="dish-img" src="${imgUrl}" alt="${dish.name}">
                    <span class="category-badge">${dish.category}</span>
                    <div class="dish-admin-actions">
                        <button class="btn-admin" onclick="openEditDishModal(${dish.id})">✏️</button>
                    </div>
                </div>
                <div class="dish-info">
                    <h3 class="dish-title">${dish.name}</h3>
                    <div class="kbju-tags">
                        <div class="kbju-tag"><span class="kbju-val">${dish.calories}</span><span class="kbju-lbl">ккал</span></div>
                    </div>
                    <div class="dish-meta">
                        <span class="prep-time">🕒 ${dish.prep_time} мин</span>
                        <div class="dish-actions">
                            <button class="btn-secondary" onclick="openRecipeModal(${dish.id})">Рецепт</button>
                            <button class="btn-primary" onclick="openOrderModal(${dish.id}, '${dish.name}')">Заказать</button>
                        </div>
                    </div>
                </div>
            `;
            dishesContainer.appendChild(card);
        });
    }

    // Modal Global Functions (added to window for onclick handlers)
    window.openOrderModal = (dishId, dishName) => {
        orderDishIdInput.value = dishId;
        orderDishNameInput.value = dishName;
        orderDateInput.value = getLocalDateString(1);
        orderModal.classList.add("active");
    };
    
    window.openRecipeModal = (dishId) => {
        const dish = dishes.find(d => d.id === dishId);
        recipeTitle.textContent = dish.name;
        recipeInstructions.textContent = dish.recipe || "Рецепт не указан.";
        recipeModal.classList.add("active");
    };

    window.openEditDishModal = (dishId) => {
        const dish = dishes.find(d => d.id === dishId);
        editDishIdInput.value = dish.id;
        editDishNameInput.value = dish.name;
        editDishCategorySelect.value = dish.category;
        editDishTimeInput.value = dish.prep_time;
        editDishDescTextarea.value = dish.description || "";
        editDishRecipeTextarea.value = dish.recipe || "";
        editDishIngredientsTextarea.value = dish.ingredients || "";
        editDishImageHidden.value = dish.image_url || "";
        editDishCaloriesInput.value = dish.calories;
        editDishProteinsInput.value = dish.proteins;
        editDishFatsInput.value = dish.fats;
        editDishCarbsInput.value = dish.carbs;
        editDishModal.classList.add("active");
    };

    // Close Modals
    document.getElementById("close-order-modal").onclick = () => orderModal.classList.remove("active");
    document.getElementById("close-recipe-modal").onclick = () => recipeModal.classList.remove("active");
    document.getElementById("close-edit-dish-modal").onclick = () => editDishModal.classList.remove("active");

    // Form Submissions
    addDishForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById("dish-name").value,
            description: document.getElementById("dish-desc").value,
            recipe: document.getElementById("dish-recipe").value,
            ingredients: document.getElementById("dish-ingredients").value,
            category: document.getElementById("dish-category").value,
            calories: parseFloat(document.getElementById("dish-calories").value) || 0,
            proteins: parseFloat(document.getElementById("dish-proteins").value) || 0,
            fats: parseFloat(document.getElementById("dish-fats").value) || 0,
            carbs: parseFloat(document.getElementById("dish-carbs").value) || 0,
            prep_time: parseInt(document.getElementById("dish-time").value) || 0,
            image_url: document.getElementById("dish-image").value
        };
        await fetch("/api/dishes", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
        addDishForm.reset();
        showToast("Блюдо добавлено! 🥗");
        navButtons[0].click();
    });

    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            dish_id: parseInt(orderDishIdInput.value),
            user_id: currentUser ? currentUser.id : null,
            ordered_by: document.getElementById("order-by").value,
            order_for_date: orderDateInput.value,
            order_for_time: document.getElementById("order-time").value,
            note: document.getElementById("order-note").value
        };
        await fetch("/api/orders", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
        orderModal.classList.remove("active");
        showToast("Заказано! 🛒");
    });

    // Orders Handling
    async function fetchOrders() {
        const response = await fetch("/api/orders");
        orders = await response.json();
        renderOrders();
    }

    function renderOrders() {
        pendingOrdersContainer.innerHTML = "";
        acceptedOrdersContainer.innerHTML = "";
        completedOrdersContainer.innerHTML = "";
        
        orders.forEach(o => {
            const card = document.createElement("div");
            card.className = "order-card";
            card.innerHTML = `
                <h4>${o.dish.name} (${o.ordered_by})</h4>
                <p>${o.order_for_date} - ${o.order_for_time}</p>
                <div class="order-actions">
                    ${o.status === 'pending' ? `<button onclick="updateStatus(${o.id}, 'accepted')">Принять</button>` : ''}
                    ${o.status === 'accepted' ? `<button onclick="updateStatus(${o.id}, 'completed')">Готово</button>` : ''}
                </div>
            `;
            if (o.status === 'pending') pendingOrdersContainer.appendChild(card);
            else if (o.status === 'accepted') acceptedOrdersContainer.appendChild(card);
            else if (o.status === 'completed') completedOrdersContainer.appendChild(card);
        });
    }

    window.updateStatus = async (id, status) => {
        await fetch(`/api/orders/${id}/status`, { method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({status})});
        fetchOrders();
        if (status === 'completed') fetchUserStats();
    };

    // Initial load
    fetchDishes();
    fetchUsers();
    fetchOrders();
});
