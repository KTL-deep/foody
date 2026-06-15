document.addEventListener("DOMContentLoaded", () => {
    // --- State ---
    let dishes = [];
    let orders = [];
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
    const editDishImageInput = document.getElementById("edit-dish-image");
    const editDishCaloriesInput = document.getElementById("edit-dish-calories");
    const editDishProteinsInput = document.getElementById("edit-dish-proteins");
    const editDishFatsInput = document.getElementById("edit-dish-fats");
    const editDishCarbsInput = document.getElementById("edit-dish-carbs");
    const closeEditDishModalBtn = document.getElementById("close-edit-dish-modal");

    // Add Dish Elements
    const addDishForm = document.getElementById("add-dish-form");

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

    // --- Helper: Toast Notification ---
    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.add("active");
        setTimeout(() => {
            toast.classList.remove("active");
        }, duration);
    }

    // --- Theme Toggle Event Listener ---
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

            // Deactivate all
            navButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(tab => tab.classList.remove("active"));

            // Activate target
            button.classList.add("active");
            document.getElementById(targetTab).classList.add("active");

            // Fetch latest data if switching to specific tabs
            if (targetTab === "menu-tab") {
                fetchDishes();
            } else if (targetTab === "orders-tab") {
                fetchOrders();
            }
        });
    });

    // --- Category Filters ---
    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            currentCategory = button.getAttribute("data-category");
            renderDishes();
        });
    });

    // --- Menu Controls Listeners ---
    menuSearchInput.addEventListener("input", renderDishes);
    menuSortSelect.addEventListener("change", renderDishes);
    showArchivedCheckbox.addEventListener("change", fetchDishes);

    // --- KBJU Summary Date Change Listener ---
    summaryDateInput.addEventListener("change", renderKbjuSummary);

    // --- API: Fetch Dishes ---
    async function fetchDishes() {
        try {
            const includeArchived = showArchivedCheckbox.checked;
            const response = await fetch(`/api/dishes?include_archived=${includeArchived}`);
            if (!response.ok) throw new Error("Ошибка при загрузке меню");
            dishes = await response.json();
            renderDishes();
        } catch (error) {
            console.error(error);
            showToast("Не удалось загрузить меню 🍳");
        }
    }

    // --- Render Dishes Grid ---
    function renderDishes() {
        dishesContainer.innerHTML = "";

        // 1. Filter by category
        let filteredDishes = currentCategory === "all"
            ? dishes
            : dishes.filter(d => d.category === currentCategory);

        // 2. Filter by search query
        const searchQuery = menuSearchInput.value.toLowerCase().trim();
        if (searchQuery) {
            filteredDishes = filteredDishes.filter(d => 
                d.name.toLowerCase().includes(searchQuery) ||
                (d.description && d.description.toLowerCase().includes(searchQuery)) ||
                (d.recipe && d.recipe.toLowerCase().includes(searchQuery))
            );
        }

        // 3. Sort dishes
        const sortValue = menuSortSelect.value;
        if (sortValue === "time-asc") {
            filteredDishes.sort((a, b) => a.prep_time - b.prep_time);
        } else if (sortValue === "calories-asc") {
            filteredDishes.sort((a, b) => a.calories - b.calories);
        } else if (sortValue === "calories-desc") {
            filteredDishes.sort((a, b) => b.calories - a.calories);
        } else if (sortValue === "proteins-desc") {
            filteredDishes.sort((a, b) => b.proteins - a.proteins);
        }

        if (filteredDishes.length === 0) {
            dishesContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    Ничего не найдено в этой категории. Попробуйте изменить фильтр или добавить блюдо! 🧁
                </div>
            `;
            return;
        }

        filteredDishes.forEach(dish => {
            const imgUrl = dish.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&auto=format&fit=crop&q=60";
            const card = document.createElement("div");
            card.className = `dish-card${dish.is_archived ? ' archived' : ''}`;

            // Admin buttons inside the card
            const archiveBtnSymbol = dish.is_archived ? "📤" : "📦";
            const archiveBtnTitle = dish.is_archived ? "Восстановить из архива" : "В архив";
            const adminActionsHtml = `
                <div class="dish-admin-actions">
                    <button class="btn-admin edit-dish-btn" data-id="${dish.id}" title="Редактировать">✏️</button>
                    <button class="btn-admin archive-btn" data-id="${dish.id}" title="${archiveBtnTitle}">${archiveBtnSymbol}</button>
                </div>
            `;

            card.innerHTML = `
                <div class="dish-img-container">
                    <img class="dish-img" src="${imgUrl}" alt="${dish.name}">
                    <span class="category-badge">${dish.category}</span>
                    ${adminActionsHtml}
                </div>
                <div class="dish-info">
                    <h3 class="dish-title">${dish.name}</h3>
                    <p class="dish-desc">${dish.description || 'Вкусное домашнее блюдо без описания.'}</p>
                    <div class="kbju-tags">
                        <div class="kbju-tag">
                            <span class="kbju-val">${dish.calories}</span>
                            <span class="kbju-lbl">ккал</span>
                        </div>
                        <div class="kbju-tag">
                            <span class="kbju-val">${dish.proteins}г</span>
                            <span class="kbju-lbl">Б</span>
                        </div>
                        <div class="kbju-tag">
                            <span class="kbju-val">${dish.fats}г</span>
                            <span class="kbju-lbl">Ж</span>
                        </div>
                        <div class="kbju-tag">
                            <span class="kbju-val">${dish.carbs}г</span>
                            <span class="kbju-lbl">У</span>
                        </div>
                    </div>
                    <div class="dish-meta">
                        <span class="prep-time">🕒 ${dish.prep_time} мин</span>
                        <div class="dish-actions">
                            <button class="btn-secondary view-recipe-btn" data-id="${dish.id}">Рецепт</button>
                            <button class="btn-primary order-dish-btn" data-id="${dish.id}" data-name="${dish.name}" ${dish.is_archived ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Заказать</button>
                        </div>
                    </div>
                </div>
            `;
            dishesContainer.appendChild(card);
        });

        // Add Event Listeners for Recipe Buttons
        document.querySelectorAll(".view-recipe-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const dishId = parseInt(e.target.getAttribute("data-id"));
                openRecipeModal(dishId);
            });
        });

        // Add Event Listeners for Order Buttons
        document.querySelectorAll(".order-dish-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                if (e.target.disabled) return;
                const dishId = parseInt(e.target.getAttribute("data-id"));
                const dishName = e.target.getAttribute("data-name");
                openOrderModal(dishId, dishName);
            });
        });

        // Add Event Listeners for Edit Buttons
        document.querySelectorAll(".edit-dish-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const dishId = parseInt(e.target.getAttribute("data-id"));
                openEditDishModal(dishId);
            });
        });

        // Add Event Listeners for Archive/Unarchive Buttons
        document.querySelectorAll(".archive-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const dishId = parseInt(e.target.getAttribute("data-id"));
                toggleArchiveDish(dishId);
            });
        });
    }

    // --- API: Fetch Orders ---
    async function fetchOrders() {
        try {
            const response = await fetch("/api/orders");
            if (!response.ok) throw new Error("Ошибка при загрузке заказов");
            orders = await response.json();
            renderOrders();
            renderKbjuSummary();
        } catch (error) {
            console.error(error);
            showToast("Не удалось загрузить список заказов 🛒");
        }
    }

    // --- Render Orders ---
    function renderOrders() {
        pendingOrdersContainer.innerHTML = "";
        acceptedOrdersContainer.innerHTML = "";
        completedOrdersContainer.innerHTML = "";

        let pendingCount = 0;
        let acceptedCount = 0;
        let completedCount = 0;

        orders.forEach(order => {
            const dateStr = formatOrderDate(order.order_for_date);
            const orderCard = document.createElement("div");
            orderCard.className = `order-card ${order.status}`;
            
            let noteHtml = order.note ? `<div class="order-note">« ${order.note} »</div>` : "";
            
            let actionsHtml = "";
            if (order.status === "pending") {
                pendingCount++;
                actionsHtml = `
                    <div class="order-actions">
                        <button class="btn-secondary cancel-order-btn" data-id="${order.id}">Отклонить</button>
                        <button class="btn-primary accept-order-btn" data-id="${order.id}" style="background-color: var(--accent-olive);">Готовить</button>
                    </div>
                `;
            } else if (order.status === "accepted") {
                acceptedCount++;
                actionsHtml = `
                    <div class="order-actions">
                        <button class="btn-primary complete-order-btn" data-id="${order.id}">Готово 🎉</button>
                    </div>
                `;
            } else if (order.status === "completed") {
                completedCount++;
            }

            orderCard.innerHTML = `
                <h3 class="order-dish-title">${order.dish.name}</h3>
                <div class="order-details">
                    Для: <strong>${order.ordered_by}</strong><br>
                    Когда: <strong>${dateStr}, ${order.order_for_time}</strong>
                </div>
                ${noteHtml}
                ${actionsHtml}
            `;

            if (order.status === "pending") {
                pendingOrdersContainer.appendChild(orderCard);
            } else if (order.status === "accepted") {
                acceptedOrdersContainer.appendChild(orderCard);
            } else if (order.status === "completed") {
                completedOrdersContainer.appendChild(orderCard);
            }
        });

        // Set Badges & Counts
        countPendingEl.textContent = pendingCount;
        countAcceptedEl.textContent = acceptedCount;
        countCompletedEl.textContent = completedCount;

        if (pendingCount > 0) {
            pendingBadge.textContent = pendingCount;
            pendingBadge.style.display = "inline-block";
        } else {
            pendingBadge.style.display = "none";
        }

        // Handle Empty States
        if (pendingCount === 0) {
            pendingOrdersContainer.innerHTML = '<div class="empty-state">Нет новых заказов. Закажите что-нибудь вкусное! 🥐</div>';
        }
        if (acceptedCount === 0) {
            acceptedOrdersContainer.innerHTML = '<div class="empty-state">На плите пока пусто... 🍳</div>';
        }
        if (completedCount === 0) {
            completedOrdersContainer.innerHTML = '<div class="empty-state">Пока никто ничего не съел 😊</div>';
        }

        // Add Button Event Listeners
        document.querySelectorAll(".accept-order-btn").forEach(btn => {
            btn.addEventListener("click", () => updateOrderStatus(btn.getAttribute("data-id"), "accepted"));
        });
        document.querySelectorAll(".cancel-order-btn").forEach(btn => {
            btn.addEventListener("click", () => updateOrderStatus(btn.getAttribute("data-id"), "cancelled"));
        });
        document.querySelectorAll(".complete-order-btn").forEach(btn => {
            btn.addEventListener("click", () => updateOrderStatus(btn.getAttribute("data-id"), "completed"));
        });
    }

    // --- Render KBJU Daily Balance ---
    function renderKbjuSummary() {
        kbjuSummaryGrid.innerHTML = "";
        const selectedDate = summaryDateInput.value;
        if (!selectedDate) return;

        // Filter active (non-cancelled) orders for the chosen date
        const activeOrdersForDate = orders.filter(o => o.order_for_date === selectedDate && o.status !== "cancelled");

        if (activeOrdersForDate.length === 0) {
            kbjuSummaryGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 20px;">
                    Нет активных заказов на этот день. Баланс КБЖУ пока пуст 📊
                </div>
            `;
            return;
        }

        // Group by user
        const summary = {};
        activeOrdersForDate.forEach(order => {
            const member = order.ordered_by;
            const dish = order.dish;
            if (!summary[member]) {
                summary[member] = {
                    calories: 0,
                    proteins: 0,
                    fats: 0,
                    carbs: 0
                };
            }
            summary[member].calories += dish.calories || 0;
            summary[member].proteins += dish.proteins || 0;
            summary[member].fats += dish.fats || 0;
            summary[member].carbs += dish.carbs || 0;
        });

        // Render summary cards
        Object.keys(summary).forEach(member => {
            const data = summary[member];
            const card = document.createElement("div");
            card.className = "kbju-summary-card";
            card.innerHTML = `
                <div class="summary-member-name">${member}</div>
                <div class="summary-kbju-values">
                    <div class="summary-kbju-item">
                        <span>Белки</span>
                        <span class="val">${data.proteins.toFixed(1)}г</span>
                    </div>
                    <div class="summary-kbju-item">
                        <span>Жиры</span>
                        <span class="val">${data.fats.toFixed(1)}г</span>
                    </div>
                    <div class="summary-kbju-item">
                        <span>Углеводы</span>
                        <span class="val">${data.carbs.toFixed(1)}г</span>
                    </div>
                    <div class="summary-kbju-calories">
                        <span>Калории</span>
                        <span>${Math.round(data.calories)} ккал</span>
                    </div>
                </div>
            `;
            kbjuSummaryGrid.appendChild(card);
        });
    }

    // --- Helper: Date Formatter ---
    function formatOrderDate(dateString) {
        const today = getLocalDateString(0);
        const tomorrow = getLocalDateString(1);

        if (dateString === today) return "Сегодня";
        if (dateString === tomorrow) return "Завтра";

        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    }

    // --- API: Update Order Status ---
    async function updateOrderStatus(orderId, status) {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (!response.ok) throw new Error("Не удалось обновить статус");
            
            showToast(status === "accepted" ? "Заказ принят в работу 👩‍🍳" : status === "completed" ? "Заказ готов! Приятного аппетита 🍽" : "Заказ отменен");
            fetchOrders();
        } catch (error) {
            console.error(error);
            showToast("Ошибка при изменении статуса заказа");
        }
    }

    // --- Order Modal Logic ---
    function openOrderModal(dishId, dishName) {
        orderDishIdInput.value = dishId;
        orderDishNameInput.value = dishName;

        // По умолчанию ставим завтрашнюю дату
        orderDateInput.value = getLocalDateString(1); // Tomorrow

        orderModal.classList.add("active");
    }

    function closeOrderModal() {
        orderModal.classList.remove("active");
        orderForm.reset();
    }

    closeOrderModalBtn.addEventListener("click", closeOrderModal);

    // --- Recipe Modal Logic ---
    function openRecipeModal(dishId) {
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return;

        recipeTitle.textContent = dish.name;
        recipeKbju.innerHTML = `
            <div class="kbju-tag">
                <span class="kbju-val">${dish.calories}</span>
                <span class="kbju-lbl">ккал</span>
            </div>
            <div class="kbju-tag">
                <span class="kbju-val">${dish.proteins}г</span>
                <span class="kbju-lbl">Белки</span>
            </div>
            <div class="kbju-tag">
                <span class="kbju-val">${dish.fats}г</span>
                <span class="kbju-lbl">Жиры</span>
            </div>
            <div class="kbju-tag">
                <span class="kbju-val">${dish.carbs}г</span>
                <span class="kbju-lbl">Углев.</span>
            </div>
        `;

        recipeInstructions.textContent = dish.recipe || "Рецепт еще не заполнен.";
        recipeModal.classList.add("active");
    }

    function closeRecipeModal() {
        recipeModal.classList.remove("active");
    }

    closeRecipeModalBtn.addEventListener("click", closeRecipeModal);

    // --- Edit Dish Modal Logic ---
    function openEditDishModal(dishId) {
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return;

        editDishIdInput.value = dish.id;
        editDishNameInput.value = dish.name;
        editDishCategorySelect.value = dish.category;
        editDishTimeInput.value = dish.prep_time;
        editDishDescTextarea.value = dish.description || "";
        editDishRecipeTextarea.value = dish.recipe || "";
        editDishImageInput.value = dish.image_url || "";
        editDishCaloriesInput.value = dish.calories;
        editDishProteinsInput.value = dish.proteins;
        editDishFatsInput.value = dish.fats;
        editDishCarbsInput.value = dish.carbs;

        editDishModal.classList.add("active");
    }

    function closeEditDishModal() {
        editDishModal.classList.remove("active");
        editDishForm.reset();
    }

    closeEditDishModalBtn.addEventListener("click", closeEditDishModal);

    // --- API: Submit Edit Dish ---
    editDishForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dishId = parseInt(editDishIdInput.value);
        const dishData = {
            name: editDishNameInput.value,
            description: editDishDescTextarea.value || null,
            recipe: editDishRecipeTextarea.value || null,
            category: editDishCategorySelect.value,
            prep_time: parseInt(editDishTimeInput.value) || 0,
            image_url: editDishImageInput.value || null,
            calories: parseFloat(editDishCaloriesInput.value) || 0,
            proteins: parseFloat(editDishProteinsInput.value) || 0,
            fats: parseFloat(editDishFatsInput.value) || 0,
            carbs: parseFloat(editDishCarbsInput.value) || 0
        };

        try {
            const response = await fetch(`/api/dishes/${dishId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dishData)
            });

            if (!response.ok) throw new Error("Не удалось сохранить изменения");

            closeEditDishModal();
            showToast("Блюдо успешно обновлено! ✏️");
            fetchDishes();
        } catch (error) {
            console.error(error);
            showToast("Ошибка при редактировании блюда");
        }
    });

    // --- API: Archive / Unarchive Dish ---
    async function toggleArchiveDish(dishId) {
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return;

        const newArchiveState = !dish.is_archived;

        try {
            const response = await fetch(`/api/dishes/${dishId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_archived: newArchiveState })
            });

            if (!response.ok) throw new Error("Не удалось архивировать блюдо");

            showToast(newArchiveState ? "Блюдо перенесено в архив 📦" : "Блюдо восстановлено из архива 📤");
            fetchDishes();
        } catch (error) {
            console.error(error);
            showToast("Ошибка при изменении статуса архива");
        }
    }

    // Modal Background Clicks (Close on click outside)
    window.addEventListener("click", (e) => {
        if (e.target === orderModal) closeOrderModal();
        if (e.target === recipeModal) closeRecipeModal();
        if (e.target === editDishModal) closeEditDishModal();
    });

    // --- API: Submit Order ---
    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const orderData = {
            dish_id: parseInt(orderDishIdInput.value),
            ordered_by: document.getElementById("order-by").value,
            order_for_date: orderDateInput.value,
            order_for_time: document.getElementById("order-time").value,
            note: document.getElementById("order-note").value || null
        };

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) throw new Error("Не удалось отправить заказ");

            closeOrderModal();
            showToast("Заказ успешно оформлен! 🥳");
            
            // Switch to orders tab
            document.getElementById("orders-nav-btn").click();
        } catch (error) {
            console.error(error);
            showToast("Не удалось заказать блюдо 😔");
        }
    });

    // --- API: Create Dish ---
    addDishForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dishData = {
            name: document.getElementById("dish-name").value,
            description: document.getElementById("dish-desc").value || null,
            recipe: document.getElementById("dish-recipe").value || null,
            category: document.getElementById("dish-category").value,
            calories: parseFloat(document.getElementById("dish-calories").value) || 0,
            proteins: parseFloat(document.getElementById("dish-proteins").value) || 0,
            fats: parseFloat(document.getElementById("dish-fats").value) || 0,
            carbs: parseFloat(document.getElementById("dish-carbs").value) || 0,
            prep_time: parseInt(document.getElementById("dish-time").value) || 0,
            image_url: document.getElementById("dish-image").value || null
        };

        try {
            const response = await fetch("/api/dishes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dishData)
            });

            if (!response.ok) throw new Error("Не удалось добавить блюдо");

            addDishForm.reset();
            showToast("Блюдо добавлено в меню! 🥬");
            
            // Go to menu tab and refresh
            navButtons[0].click();
        } catch (error) {
            console.error(error);
            showToast("Ошибка при создании блюда");
        }
    });

    // --- Initial Load ---
    fetchDishes();
    fetchOrders(); // load counts & orders immediately

    // Auto-update orders every 30 seconds for live kitchen view
    setInterval(() => {
        if (document.getElementById("orders-tab").classList.contains("active")) {
            fetchOrders();
        }
    }, 30000);
});
