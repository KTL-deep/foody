document.addEventListener("DOMContentLoaded", () => {
    // --- State ---
    let dishes = [];
    let orders = [];
    let users = [];
    let currentUser = null;
    let selectedUserId = null;
    let token = localStorage.getItem("foody_token") || null;
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

    // --- API Fetch Wrapper with Auth Header ---
    async function apiFetch(url, options = {}) {
        const headers = options.headers || {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }
        options.headers = headers;

        const response = await fetch(url, options);
        if (response.status === 401) {
            // Token expired or invalid
            token = null;
            currentUser = null;
            localStorage.removeItem("foody_token");
            updateAuthUI();
        }
        return response;
    }

    // --- DOM Elements ---
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const dishesContainer = document.getElementById("dishes-container");


    // Auth Elements
    const openAuthBtn = document.getElementById("open-auth-btn");
    const authUserBadge = document.getElementById("auth-user-badge");
    const authUserName = document.getElementById("auth-user-name");
    const logoutBtn = document.getElementById("logout-btn");

    const authModal = document.getElementById("auth-modal");
    const closeAuthModalBtn = document.getElementById("close-auth-modal");
    const authTabLoginBtn = document.getElementById("auth-tab-login-btn");
    const authTabRegisterBtn = document.getElementById("auth-tab-register-btn");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    // Menu Controls
    const menuSearchInput = document.getElementById("menu-search");
    const menuSortSelect = document.getElementById("menu-sort");
    const showArchivedCheckbox = document.getElementById("show-archived");

    // Order Modal Elements
    const orderModal = document.getElementById("order-modal");
    const orderForm = document.getElementById("order-form");
    const orderDishIdInput = document.getElementById("order-dish-id");
    const orderDishNameInput = document.getElementById("order-dish-name");
    const orderBySelect = document.getElementById("order-by");
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
    if (summaryDateInput) summaryDateInput.value = getLocalDateString(0);
    if (groceryStartInput) groceryStartInput.value = getLocalDateString(0);
    if (groceryEndInput) groceryEndInput.value = getLocalDateString(7);

    // --- Helper: Toast Notification ---
    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.add("active");
        setTimeout(() => {
            toast.classList.remove("active");
        }, duration);
    }


    // Welcome Screen & Main App Elements
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainAppWrapper = document.getElementById("main-app-wrapper");

    const landingTabLoginBtn = document.getElementById("landing-tab-login-btn");
    const landingTabRegisterBtn = document.getElementById("landing-tab-register-btn");
    const landingLoginForm = document.getElementById("landing-login-form");
    const landingRegisterForm = document.getElementById("landing-register-form");

    // --- Auth UI Management ---
    function updateAuthUI() {
        if (currentUser) {
            if (welcomeScreen) welcomeScreen.style.display = "none";
            if (mainAppWrapper) mainAppWrapper.style.display = "block";
            if (authUserBadge) authUserBadge.style.display = "flex";
            if (authUserName) authUserName.textContent = `👤 ${currentUser.name}`;
            if (!selectedUserId) selectedUserId = currentUser.id;
            if (userSelect) userSelect.value = selectedUserId;
        } else {
            if (welcomeScreen) welcomeScreen.style.display = "block";
            if (mainAppWrapper) mainAppWrapper.style.display = "none";
            if (authUserBadge) authUserBadge.style.display = "none";
            selectedUserId = null;
        }
    }

    async function checkAuth() {
        if (!token) {
            currentUser = null;
            updateAuthUI();
            return;
        }
        try {
            const response = await apiFetch("/api/auth/me");
            if (response.ok) {
                currentUser = await response.json();
                selectedUserId = currentUser.id;
                updateAuthUI();
                fetchDishes();
                fetchUsers();
                fetchOrders();
                fetchUserStats();
            } else {
                token = null;
                currentUser = null;
                localStorage.removeItem("foody_token");
                updateAuthUI();
            }
        } catch (e) {
            console.error(e);
            token = null;
            currentUser = null;
            localStorage.removeItem("foody_token");
            updateAuthUI();
        }
    }

    if (openAuthBtn) {
        openAuthBtn.addEventListener("click", () => {
            authModal.classList.add("active");
        });
    }

    if (closeAuthModalBtn) {
        closeAuthModalBtn.addEventListener("click", () => {
            authModal.classList.remove("active");
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            token = null;
            currentUser = null;
            selectedUserId = null;
            localStorage.removeItem("foody_token");
            updateAuthUI();
            showToast("Вы вышли из профиля 🚪");
        });
    }

    if (landingTabLoginBtn && landingTabRegisterBtn) {
        landingTabLoginBtn.addEventListener("click", () => {
            landingTabLoginBtn.classList.add("active");
            landingTabRegisterBtn.classList.remove("active");
            landingLoginForm.style.display = "block";
            landingRegisterForm.style.display = "none";
        });

        landingTabRegisterBtn.addEventListener("click", () => {
            landingTabRegisterBtn.classList.add("active");
            landingTabLoginBtn.classList.remove("active");
            landingLoginForm.style.display = "none";
            landingRegisterForm.style.display = "block";
        });
    }

    if (landingLoginForm) {
        landingLoginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("landing-login-name").value.trim();
            const password = document.getElementById("landing-login-password").value;

            try {
                const res = await apiFetch("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ name, password })
                });
                const data = await res.json();
                if (res.ok) {
                    token = data.access_token;
                    currentUser = data.user;
                    selectedUserId = currentUser.id;
                    localStorage.setItem("foody_token", token);
                    updateAuthUI();
                    landingLoginForm.reset();
                    showToast(`С возвращением в Семейное Кафе, ${currentUser.name}! 👋`);
                    fetchDishes();
                    fetchUsers();
                    fetchOrders();
                    fetchUserStats();
                } else {
                    let errMsg = "Ошибка входа";
                    if (data && data.detail) {
                        errMsg = typeof data.detail === "string" ? data.detail : (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(", ") : JSON.stringify(data.detail));
                    }
                    showToast(errMsg);
                }
            } catch (err) {
                showToast("Ошибка сети при входе");
            }
        });
    }

    if (landingRegisterForm) {
        landingRegisterForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("landing-register-name").value.trim();
            const password = document.getElementById("landing-register-password").value;
            const target_calories = parseFloat(document.getElementById("landing-register-calories").value) || 2000;

            try {
                const res = await apiFetch("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        password,
                        target_calories,
                        target_proteins: 100,
                        target_fats: 60,
                        target_carbs: 250
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    token = data.access_token;
                    currentUser = data.user;
                    selectedUserId = currentUser.id;
                    localStorage.setItem("foody_token", token);
                    updateAuthUI();
                    landingRegisterForm.reset();
                    showToast(`Добро пожаловать в Семейное Кафе, ${currentUser.name}! 🎉`);
                    fetchDishes();
                    fetchUsers();
                    fetchOrders();
                    fetchUserStats();
                } else {
                    let errMsg = "Ошибка регистрации";
                    if (data && data.detail) {
                        errMsg = typeof data.detail === "string" ? data.detail : (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(", ") : JSON.stringify(data.detail));
                    }
                    showToast(errMsg);
                }
            } catch (err) {
                showToast("Ошибка при отправке данных");
            }
        });
    }

    if (authTabLoginBtn && authTabRegisterBtn) {
        authTabLoginBtn.addEventListener("click", () => {
            authTabLoginBtn.classList.add("active");
            authTabRegisterBtn.classList.remove("active");
            loginForm.style.display = "block";
            registerForm.style.display = "none";
        });

        authTabRegisterBtn.addEventListener("click", () => {
            authTabRegisterBtn.classList.add("active");
            authTabLoginBtn.classList.remove("active");
            loginForm.style.display = "none";
            registerForm.style.display = "block";
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("login-name").value.trim();
            const password = document.getElementById("login-password").value;

            try {
                const res = await apiFetch("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ name, password })
                });
                const data = await res.json();
                if (res.ok) {
                    token = data.access_token;
                    currentUser = data.user;
                    selectedUserId = currentUser.id;
                    localStorage.setItem("foody_token", token);
                    updateAuthUI();
                    authModal.classList.remove("active");
                    loginForm.reset();
                    showToast(`С возвращением, ${currentUser.name}! 👋`);
                    fetchDishes();
                    fetchUsers();
                    fetchOrders();
                    fetchUserStats();
                } else {
                    showToast(data.detail || "Ошибка входа");
                }
            } catch (err) {
                showToast("Ошибка сети при входе");
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("register-name").value.trim();
            const password = document.getElementById("register-password").value;
            const target_calories = parseFloat(document.getElementById("register-calories").value) || 2000;

            try {
                const res = await apiFetch("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        password,
                        target_calories,
                        target_proteins: 100,
                        target_fats: 60,
                        target_carbs: 250
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    token = data.access_token;
                    currentUser = data.user;
                    localStorage.setItem("foody_token", token);
                    updateAuthUI();
                    authModal.classList.remove("active");
                    registerForm.reset();
                    showToast(`Добро пожаловать в систему, ${currentUser.name}! 🎉`);
                    fetchUsers();
                    fetchUserStats();
                } else {
                    let errMsg = "Ошибка регистрации";
                    if (data && data.detail) {
                        errMsg = typeof data.detail === "string" ? data.detail : (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(", ") : JSON.stringify(data.detail));
                    }
                    showToast(errMsg);
                }
            } catch (err) {
                console.error("Register Error:", err);
                showToast("Ошибка при отправке данных");
            }
        });
    }

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

    // --- Category Filters ---
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.getAttribute("data-category");
            renderDishes();
        });
    });

    if (menuSearchInput) menuSearchInput.addEventListener("input", renderDishes);
    if (menuSortSelect) menuSortSelect.addEventListener("change", renderDishes);
    if (showArchivedCheckbox) showArchivedCheckbox.addEventListener("change", fetchDishes);

    // --- Photo Upload Logic ---
    async function handleFileUpload(file, previewId, statusId, hiddenInputId) {
        const formData = new FormData();
        formData.append("file", file);
        
        document.getElementById(statusId).textContent = "Загрузка...";
        
        try {
            const response = await apiFetch("/api/upload-photo", {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            document.getElementById(hiddenInputId).value = data.image_url;
            document.getElementById(statusId).textContent = "Готово ✅";
            
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.querySelector("img").src = data.image_url;
                preview.style.display = "block";
            }
        } catch (error) {
            console.error(error);
            document.getElementById(statusId).textContent = "Ошибка ❌";
        }
    }

    if (cameraInput) {
        cameraInput.addEventListener("change", (e) => {
            if (e.target.files[0]) {
                handleFileUpload(e.target.files[0], "photo-preview", "photo-status", "dish-image");
            }
        });
    }

    if (editCameraInput) {
        editCameraInput.addEventListener("change", (e) => {
            if (e.target.files[0]) {
                handleFileUpload(e.target.files[0], "edit-photo-preview", "edit-photo-status", "edit-dish-image");
            }
        });
    }

    // --- User Management ---
    async function fetchUsers() {
        try {
            const response = await apiFetch("/api/users");
            users = await response.json();
            renderUserSelect();
            if (users.length > 0 && !selectedUserId) {
                selectedUserId = currentUser ? currentUser.id : users[0].id;
                if (userSelect) userSelect.value = selectedUserId;
            }
            fetchUserStats();
        } catch (error) {
            console.error(error);
        }
    }

    function renderUserSelect() {
        if (!userSelect) return;
        userSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join("");
        if (selectedUserId) {
            userSelect.value = selectedUserId;
        } else if (currentUser) {
            userSelect.value = currentUser.id;
            selectedUserId = currentUser.id;
        }
    }

    if (userSelect) {
        userSelect.addEventListener("change", (e) => {
            selectedUserId = parseInt(e.target.value);
            fetchUserStats();
        });
    }

    let statsPeriod = "day";
    let statsDate = getLocalDateString(0);

    const statsDateInput = document.getElementById("stats-date-input");
    const statsPeriodDayBtn = document.getElementById("stats-period-day");
    const statsPeriodMonthBtn = document.getElementById("stats-period-month");
    const statsPeriodYearBtn = document.getElementById("stats-period-year");

    if (statsDateInput) {
        statsDateInput.value = statsDate;
        statsDateInput.addEventListener("change", (e) => {
            if (e.target.value) {
                statsDate = e.target.value;
                fetchUserStats();
            }
        });
    }

    function setStatsPeriod(period, btn) {
        statsPeriod = period;
        [statsPeriodDayBtn, statsPeriodMonthBtn, statsPeriodYearBtn].forEach(b => {
            if (b) b.classList.remove("active");
        });
        if (btn) btn.classList.add("active");
        fetchUserStats();
    }

    if (statsPeriodDayBtn) statsPeriodDayBtn.addEventListener("click", () => setStatsPeriod("day", statsPeriodDayBtn));
    if (statsPeriodMonthBtn) statsPeriodMonthBtn.addEventListener("click", () => setStatsPeriod("month", statsPeriodMonthBtn));
    if (statsPeriodYearBtn) statsPeriodYearBtn.addEventListener("click", () => setStatsPeriod("year", statsPeriodYearBtn));

    async function fetchUserStats() {
        const targetUserId = selectedUserId || (currentUser ? currentUser.id : null);
        if (!targetUserId) return;
        try {
            const response = await apiFetch(`/api/users/${targetUserId}/stats?period=${statsPeriod}&target_date=${statsDate}`);
            const stats = await response.json();
            renderUserStats(stats);
            if (document.getElementById("target-calories")) {
                document.getElementById("target-calories").value = stats.targets.target_calories;
                document.getElementById("target-proteins").value = stats.targets.target_proteins;
                document.getElementById("target-fats").value = stats.targets.target_fats;
                document.getElementById("target-carbs").value = stats.targets.target_carbs;
            }
        } catch (error) {
            console.error(error);
        }
    }

    function renderUserStats(stats) {
        if (!userStatsContainer) return;
        const p = (val, target) => Math.min(100, (val / target) * 100);

        let periodTitle = "за выбранный день";
        if (stats.period === "month") periodTitle = `за месяц (${stats.date ? stats.date.slice(0, 7) : ''})`;
        else if (stats.period === "year") periodTitle = `за ${stats.date ? stats.date.slice(0, 4) : ''} год`;

        let avgInfoHTML = "";
        if (stats.period !== "day" && stats.averages) {
            avgInfoHTML = `
                <div style="margin-top: 15px; padding-top: 12px; border-top: 1px dashed var(--border-cozy); font-size: 0.85rem;">
                    <p style="margin-bottom: 6px;">📈 <strong>Среднесуточные значения</strong> (за ${stats.active_days_count} активных дн.):</p>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; background: var(--bg-cozy); padding: 8px 12px; border-radius: 8px;">
                        <span>Ккал: <strong>${Math.round(stats.averages.calories)}</strong></span>
                        <span>Белки: <strong>${stats.averages.proteins}г</strong></span>
                        <span>Жиры: <strong>${stats.averages.fats}г</strong></span>
                        <span>Углеводы: <strong>${stats.averages.carbs}г</strong></span>
                    </div>
                </div>
            `;
        }

        userStatsContainer.innerHTML = `
            <div class="user-stats-card" style="background: var(--card-bg); padding: 20px; border-radius: var(--radius-cozy); border: 1px solid var(--border-cozy); box-shadow: var(--shadow-cozy);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h3>Привет, ${stats.user_name}! 🍳</h3>
                    <span style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-cozy); padding: 4px 12px; border-radius: var(--radius-pill); border: 1px solid var(--border-cozy);">Заказов: ${stats.orders_count}</span>
                </div>
                <p style="margin-top: 5px; font-size: 0.9rem; color: var(--text-muted);">Статистика съеденного КБЖУ ${periodTitle}:</p>
                
                <div class="stat-row" style="margin-top: 15px;">
                    <span>Калории: ${Math.round(stats.consumed.calories)} ${stats.period === 'day' ? '/ ' + stats.targets.target_calories : ''} ккал</span>
                    <div class="progress-bar" style="background: var(--border-cozy); height: 12px; border-radius: 6px; overflow: hidden; margin-top: 5px;">
                        <div style="width: ${stats.period === 'day' ? p(stats.consumed.calories, stats.targets.target_calories) : p(stats.consumed.calories, stats.targets.target_calories * (stats.active_days_count || 1))}%; background: var(--accent-terracotta); height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
                
                <div class="nutrients-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
                    <div class="nutr-item" style="text-align: center; background: var(--bg-cozy); padding: 10px; border-radius: 8px; border: 1px solid var(--border-cozy);">
                        <small>Белки</small><br>
                        <strong>${stats.consumed.proteins.toFixed(1)}г</strong>
                    </div>
                    <div class="nutr-item" style="text-align: center; background: var(--bg-cozy); padding: 10px; border-radius: 8px; border: 1px solid var(--border-cozy);">
                        <small>Жиры</small><br>
                        <strong>${stats.consumed.fats.toFixed(1)}г</strong>
                    </div>
                    <div class="nutr-item" style="text-align: center; background: var(--bg-cozy); padding: 10px; border-radius: 8px; border: 1px solid var(--border-cozy);">
                        <small>Углеводы</small><br>
                        <strong>${stats.consumed.carbs.toFixed(1)}г</strong>
                    </div>
                </div>

                ${avgInfoHTML}
            </div>
        `;
    }

    if (userTargetsForm) {
        userTargetsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast("Необходимо войти в профиль 🔑");
                return;
            }
            const data = {
                target_calories: parseFloat(document.getElementById("target-calories").value) || 2000,
                target_proteins: parseFloat(document.getElementById("target-proteins").value) || 100,
                target_fats: parseFloat(document.getElementById("target-fats").value) || 60,
                target_carbs: parseFloat(document.getElementById("target-carbs").value) || 250
            };
            try {
                const res = await apiFetch(`/api/users/${currentUser.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(data)
                });
                const resData = await res.json();
                if (res.ok) {
                    currentUser = resData;
                    selectedUserId = currentUser.id;
                    if (userSelect) userSelect.value = selectedUserId;
                    showToast("Цели обновлены! 💪");
                    fetchUserStats();
                } else {
                    let errMsg = "Ошибка при обновлении целей";
                    if (resData && resData.detail) {
                        errMsg = typeof resData.detail === "string" ? resData.detail : (Array.isArray(resData.detail) ? resData.detail.map(d => d.msg).join(", ") : JSON.stringify(resData.detail));
                    }
                    showToast(errMsg);
                }
            } catch (error) {
                showToast("Ошибка при обновлении целей");
            }
        });
    }

    // --- Grocery List ---
    if (generateGroceryBtn) {
        generateGroceryBtn.addEventListener("click", async () => {
            const start = groceryStartInput.value;
            const end = groceryEndInput.value;
            try {
                const response = await apiFetch(`/api/grocery-list?start_date=${start}&end_date=${end}`);
                const data = await response.json();
                renderGroceryList(data.grocery_list);
            } catch (error) {
                showToast("Ошибка при генерации списка");
            }
        });
    }

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
            const includeArchived = showArchivedCheckbox ? showArchivedCheckbox.checked : false;
            const response = await apiFetch(`/api/dishes?include_archived=${includeArchived}`);
            dishes = await response.json();
            renderDishes();
        } catch (error) {
            showToast("Ошибка загрузки меню 🍳");
        }
    }

    function renderDishes() {
        if (!dishesContainer) return;
        dishesContainer.innerHTML = "";
        let filtered = currentCategory === "all" ? dishes : dishes.filter(d => d.category === currentCategory);
        
        const searchQuery = menuSearchInput ? menuSearchInput.value.toLowerCase().trim() : "";
        if (searchQuery) {
            filtered = filtered.filter(d => d.name.toLowerCase().includes(searchQuery) || (d.ingredients && d.ingredients.toLowerCase().includes(searchQuery)));
        }

        const sortMode = menuSortSelect ? menuSortSelect.value : "default";
        if (sortMode === "time-asc") filtered.sort((a, b) => a.prep_time - b.prep_time);
        else if (sortMode === "calories-asc") filtered.sort((a, b) => a.calories - b.calories);
        else if (sortMode === "calories-desc") filtered.sort((a, b) => b.calories - a.calories);
        else if (sortMode === "proteins-desc") filtered.sort((a, b) => b.proteins - a.proteins);

        filtered.forEach(dish => {
            const imgUrl = dish.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&auto=format&fit=crop&q=60";
            const card = document.createElement("div");
            card.className = `dish-card${dish.is_archived ? ' archived' : ''}`;
            card.innerHTML = `
                <div class="dish-img-container">
                    <img class="dish-img" src="${imgUrl}" alt="${dish.name}">
                    <span class="category-badge">${dish.category}</span>
                    <div class="dish-admin-actions" style="display: flex; gap: 6px;">
                        <button class="btn-admin" onclick="openEditDishModal(${dish.id})" title="Редактировать">✏️</button>
                        <button class="btn-admin" onclick="toggleArchiveDish(${dish.id}, ${dish.is_archived})" title="${dish.is_archived ? 'Из архива' : 'В архив'}">${dish.is_archived ? '📤' : '📦'}</button>
                        <button class="btn-admin" onclick="confirmDeleteDish(${dish.id}, '${dish.name.replace(/'/g, "\\'")}')" style="background: rgba(217, 106, 79, 0.2);" title="Удалить">🗑</button>
                    </div>
                </div>
                <div class="dish-info">
                    <h3 class="dish-title">${dish.name}</h3>
                    <div class="kbju-tags">
                        <div class="kbju-tag"><span class="kbju-val">${dish.calories}</span><span class="kbju-lbl">ккал</span></div>
                        <div class="kbju-tag"><span class="kbju-val">${dish.proteins}г</span><span class="kbju-lbl">белки</span></div>
                        <div class="kbju-tag"><span class="kbju-val">${dish.fats}г</span><span class="kbju-lbl">жиры</span></div>
                        <div class="kbju-tag"><span class="kbju-val">${dish.carbs}г</span><span class="kbju-lbl">углеводы</span></div>
                    </div>
                    <div class="dish-meta">
                        <span class="prep-time">🕒 ${dish.prep_time} мин</span>
                        <div class="dish-actions">
                            <button class="btn-secondary" onclick="openRecipeModal(${dish.id})">Рецепт</button>
                            <button class="btn-primary" onclick="openOrderModal(${dish.id}, '${dish.name.replace(/'/g, "\\'")}')">Заказать</button>
                        </div>
                    </div>
                </div>
            `;
            dishesContainer.appendChild(card);
        });
    }

    // --- Helper: Require Auth Check ---
    function requireAuth(actionCallback) {
        if (!currentUser) {
            showToast("Для совершения этого действия необходимо войти 🔑");
            if (authModal) authModal.classList.add("active");
            return false;
        }
        if (actionCallback) actionCallback();
        return true;
    }

    // Modal Global Functions (added to window for onclick handlers)
    window.toggleArchiveDish = async (dishId, isArchived) => {
        if (!requireAuth()) return;
        try {
            const response = await apiFetch(`/api/dishes/${dishId}/archive`, { method: "PATCH" });
            if (response.ok) {
                showToast(isArchived ? "Блюдо возвращено из архива 📤" : "Блюдо перемещено в архив 📦");
                fetchDishes();
            }
        } catch (e) {
            showToast("Ошибка смены статуса архива");
        }
    };

    window.confirmDeleteDish = async (dishId, dishName) => {
        if (!requireAuth()) return;
        if (confirm(`Вы действительно хотите безвозвратно удалить блюдо "${dishName}"?`)) {
            try {
                const response = await apiFetch(`/api/dishes/${dishId}`, { method: "DELETE" });
                if (response.ok) {
                    showToast(`Блюдо "${dishName}" удалено 🗑`);
                    fetchDishes();
                }
            } catch (e) {
                showToast("Ошибка при удалении блюда");
            }
        }
    };

    window.openOrderModal = (dishId, dishName) => {
        if (!requireAuth()) return;
        orderDishIdInput.value = dishId;
        orderDishNameInput.value = dishName;
        orderDateInput.value = getLocalDateString(1);
        if (currentUser && orderBySelect) {
            orderBySelect.value = currentUser.name;
        }
        orderModal.classList.add("active");
    };
    
    window.openRecipeModal = (dishId) => {
        const dish = dishes.find(d => d.id === dishId);
        recipeTitle.textContent = dish.name;
        if (recipeKbju) {
            recipeKbju.innerHTML = `
                <div class="kbju-tag"><span class="kbju-val">${dish.calories}</span><span class="kbju-lbl">ккал</span></div>
                <div class="kbju-tag"><span class="kbju-val">${dish.proteins}г</span><span class="kbju-lbl">белки</span></div>
                <div class="kbju-tag"><span class="kbju-val">${dish.fats}г</span><span class="kbju-lbl">жиры</span></div>
                <div class="kbju-tag"><span class="kbju-val">${dish.carbs}г</span><span class="kbju-lbl">углеводы</span></div>
            `;
        }
        recipeInstructions.textContent = dish.recipe || "Рецепт не указан.";
        recipeModal.classList.add("active");
    };

    window.openEditDishModal = (dishId) => {
        if (!requireAuth()) return;
        const dish = dishes.find(d => d.id === dishId);
        editDishIdInput.value = dish.id;
        editDishNameInput.value = dish.name;
        if (editDishCategorySelect) editDishCategorySelect.value = dish.category;
        if (editDishTimeInput) editDishTimeInput.value = dish.prep_time;
        if (editDishDescTextarea) editDishDescTextarea.value = dish.description || "";
        if (editDishRecipeTextarea) editDishRecipeTextarea.value = dish.recipe || "";
        if (editDishIngredientsTextarea) editDishIngredientsTextarea.value = dish.ingredients || "";
        if (editDishImageHidden) editDishImageHidden.value = dish.image_url || "";
        if (editDishCaloriesInput) editDishCaloriesInput.value = dish.calories;
        if (editDishProteinsInput) editDishProteinsInput.value = dish.proteins;
        if (editDishFatsInput) editDishFatsInput.value = dish.fats;
        if (editDishCarbsInput) editDishCarbsInput.value = dish.carbs;
        editDishModal.classList.add("active");
    };

    // Close Modals
    if (closeOrderModalBtn) closeOrderModalBtn.onclick = () => orderModal.classList.remove("active");
    if (closeRecipeModalBtn) closeRecipeModalBtn.onclick = () => recipeModal.classList.remove("active");
    if (closeEditDishModalBtn) closeEditDishModalBtn.onclick = () => editDishModal.classList.remove("active");

    // Form Submissions
    if (addDishForm) {
        addDishForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!requireAuth()) return;
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
                prep_time: parseInt(document.getElementById("dish-time") ? document.getElementById("dish-time").value : 0) || 0,
                image_url: document.getElementById("dish-image").value
            };
            const res = await apiFetch("/api/dishes", { method: "POST", body: JSON.stringify(data)});
            if (res.ok) {
                addDishForm.reset();
                showToast("Блюдо добавлено! 🥗");
                navButtons[0].click();
            }
        });
    }

    if (orderForm) {
        orderForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!requireAuth()) return;
            const data = {
                dish_id: parseInt(orderDishIdInput.value),
                user_id: currentUser ? currentUser.id : null,
                ordered_by: orderBySelect.value,
                order_for_date: orderDateInput.value,
                order_for_time: document.getElementById("order-time").value,
                note: document.getElementById("order-note").value
            };
            const res = await apiFetch("/api/orders", { method: "POST", body: JSON.stringify(data)});
            if (res.ok) {
                orderModal.classList.remove("active");
                showToast("Заказано! 🛒");
            }
        });
    }

    // Orders Handling
    async function fetchOrders() {
        const response = await apiFetch("/api/orders");
        orders = await response.json();
        renderOrders();
    }

    function renderOrders() {
        if (!pendingOrdersContainer) return;
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
                    ${o.status === 'pending' ? `<button class="btn-cozy" onclick="updateStatus(${o.id}, 'accepted')">Принять 🍳</button>` : ''}
                    ${o.status === 'accepted' ? `<button class="btn-primary" onclick="updateStatus(${o.id}, 'completed')">Готово ✅</button>` : ''}
                </div>
            `;
            if (o.status === 'pending') pendingOrdersContainer.appendChild(card);
            else if (o.status === 'accepted') acceptedOrdersContainer.appendChild(card);
            else if (o.status === 'completed') completedOrdersContainer.appendChild(card);
        });
    }

    window.updateStatus = async (id, status) => {
        if (!requireAuth()) return;
        const res = await apiFetch(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({status})});
        if (res.ok) {
            fetchOrders();
            if (status === 'completed') fetchUserStats();
        }
    };

    // Initial load
    checkAuth();
    fetchDishes();
    fetchUsers();
    fetchOrders();
});
