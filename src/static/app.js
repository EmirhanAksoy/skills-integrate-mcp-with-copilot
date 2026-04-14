document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupHint = document.getElementById("signup-hint");
  const authStatus = document.getElementById("auth-status");
  const userMenuButton = document.getElementById("user-menu-button");
  const userDropdown = document.getElementById("user-dropdown");
  const openLoginModalButton = document.getElementById("open-login-modal");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const closeLoginModalButton = document.getElementById("close-login-modal");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  let isTeacherAuthenticated = false;
  let teacherUsername = null;

  function showMessage(text, kind = "info") {
    messageDiv.textContent = text;
    messageDiv.className = kind;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    if (isTeacherAuthenticated) {
      authStatus.textContent = `Teacher mode: ${teacherUsername}`;
      signupForm.classList.remove("hidden");
      signupHint.classList.add("hidden");
      openLoginModalButton.classList.add("hidden");
      logoutButton.classList.remove("hidden");
    } else {
      authStatus.textContent = "Viewing as student";
      signupForm.classList.add("hidden");
      signupHint.classList.remove("hidden");
      openLoginModalButton.classList.remove("hidden");
      logoutButton.classList.add("hidden");
    }
  }

  async function fetchAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const payload = await response.json();
      isTeacherAuthenticated = payload.authenticated;
      teacherUsername = payload.username;
      updateAuthUI();
    } catch (error) {
      isTeacherAuthenticated = false;
      teacherUsername = null;
      updateAuthUI();
      console.error("Error fetching auth status:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML = details.participants.length
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacherAuthenticated
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (isTeacherAuthenticated) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isTeacherAuthenticated) {
      showMessage("Teacher login required", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          password: passwordInput.value,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        showMessage(payload.detail || "Login failed", "error");
        return;
      }

      showMessage(payload.message, "success");
      loginModal.classList.add("hidden");
      userDropdown.classList.add("hidden");
      loginForm.reset();
      await fetchAuthStatus();
      await fetchActivities();
    } catch (error) {
      showMessage("Unable to login right now.", "error");
      console.error("Error during login:", error);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        showMessage(payload.detail || "Logout failed", "error");
        return;
      }

      showMessage(payload.message, "success");
      userDropdown.classList.add("hidden");
      await fetchAuthStatus();
      await fetchActivities();
    } catch (error) {
      showMessage("Unable to logout right now.", "error");
      console.error("Error during logout:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isTeacherAuthenticated) {
      showMessage("Teacher login required", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuButton.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  openLoginModalButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userDropdown.classList.add("hidden");
    usernameInput.focus();
  });

  closeLoginModalButton.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", handleLogout);

  window.addEventListener("click", (event) => {
    if (!userDropdown.contains(event.target) && event.target !== userMenuButton) {
      userDropdown.classList.add("hidden");
    }

    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Initialize app
  fetchAuthStatus().then(fetchActivities);
});
