// help.js - Functionality for the help center page

document.addEventListener("DOMContentLoaded", async function () {
  // Initialize layout
  await LayoutManager.init("help-center");

  // DOM Elements
  const navItems = document.querySelectorAll(".nav-item");
  const helpSections = document.querySelectorAll(".help-section");
  const searchInput = document.getElementById("help-search-input");
  const faqItems = document.querySelectorAll(".faq-item");
  const chatModal = document.getElementById("chat-modal");
  const startChatBtn = document.getElementById("start-chat-btn");
  const closeModalBtn = document.querySelector(".close");
  const sendMessageBtn = document.getElementById("send-message-btn");
  const chatMessageInput = document.getElementById("chat-message-input");
  const chatMessages = document.getElementById("chat-messages");
  const supportForm = document.getElementById("support-form");

  // Variables
  let activeSectionId = "welcome"; // Default active section
  let searchTimeout;

  // Help navigation
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetId = item.getAttribute("data-target");

      // Update active nav item
      navItems.forEach((navItem) => navItem.classList.remove("active"));
      item.classList.add("active");

      // Show target section
      helpSections.forEach((section) => {
        section.classList.remove("active");
        if (section.id === targetId) {
          section.classList.add("active");
          activeSectionId = targetId;

          // Update URL hash
          window.location.hash = targetId;
        }
      });

      // Scroll to top of the content
      document.querySelector(".help-content").scrollTop = 0;
    });
  });
  document.querySelectorAll("[data-target]").forEach((element) => {
    element.addEventListener("click", function(e) {
      // Prevent default for links
      if (this.tagName === "A") {
        e.preventDefault();
      }

      const targetId = this.getAttribute("data-target");

      // Find the matching section
      const targetSection = document.getElementById(targetId) ||
          document.getElementById("syncing-data"); // Special case for sync-data/syncing-data

      if (targetSection) {
        // Find the matching nav item
        const targetNav = Array.from(navItems).find(
            (item) => item.getAttribute("data-target") === targetId
        );

        if (targetNav) {
          // Update active nav item
          navItems.forEach((navItem) => navItem.classList.remove("active"));
          targetNav.classList.add("active");

          // Show target section
          helpSections.forEach((section) => {
            section.classList.remove("active");
          });
          targetSection.classList.add("active");
          activeSectionId = targetId;

          // Update URL hash
          window.location.hash = targetId;

          // Scroll to top of the content
          document.querySelector(".help-content").scrollTop = 0;
        }
      }
    });
  });

  // Handle URL hash on page load
  function handleUrlHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const targetNav = Array.from(navItems).find(
        (item) => item.getAttribute("data-target") === hash
      );
      if (targetNav) {
        targetNav.click();
      }
    }
  }

  // Handle FAQ toggles
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      // Toggle the current FAQ item
      item.classList.toggle("active");

      // Update the toggle icon
      const toggleIcon = item.querySelector(".toggle-icon");
      toggleIcon.textContent = item.classList.contains("active") ? "−" : "+";
    });
  });

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        performSearch(searchTerm);
      }, 300);
    });

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const searchTerm = searchInput.value.toLowerCase().trim();
        performSearch(searchTerm);
      }
    });
  }

  function performSearch(searchTerm) {
    if (!searchTerm) {
      // If search is empty, reset to default view
      navItems.forEach((item) => (item.style.display = "block"));
      const defaultNav = document.querySelector(
        `.nav-item[data-target="${activeSectionId}"]`
      );
      if (defaultNav) defaultNav.click();
      return;
    }

    // Filter navigation items
    let hasResults = false;
    navItems.forEach((item) => {
      const itemText = item.textContent.toLowerCase();
      if (itemText.includes(searchTerm)) {
        item.style.display = "block";
        hasResults = true;
      } else {
        item.style.display = "none";
      }
    });

    // Click the first visible item
    if (hasResults) {
      const firstVisibleItem = Array.from(navItems).find(
        (item) => item.style.display !== "none"
      );
      if (firstVisibleItem) {
        firstVisibleItem.click();
      }
    }
  }

  // Live Chat Modal
  if (startChatBtn) {
    startChatBtn.addEventListener("click", () => {
      if (chatModal) {
        chatModal.style.display = "block";
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (chatModal) {
        chatModal.style.display = "none";
      }
    });
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === chatModal) {
      chatModal.style.display = "none";
    }
  });

  // Send message in chat
  if (sendMessageBtn && chatMessageInput && chatMessages) {
    sendMessageBtn.addEventListener("click", () => {
      sendChatMessage();
    });

    chatMessageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  function sendChatMessage() {
    const message = chatMessageInput.value.trim();
    if (!message) return;

    // Add message to chat
    const messageElement = document.createElement("div");
    messageElement.className = "message user";

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageElement.innerHTML = `
      <div class="message-content">
        <p>${escapeHtml(message)}</p>
        <div class="message-time">${timeString}</div>
      </div>
    `;

    chatMessages.appendChild(messageElement);

    // Clear input
    chatMessageInput.value = "";

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Simulate agent response after a delay
    setTimeout(() => {
      simulateAgentResponse();
    }, 1000 + Math.random() * 2000);
  }

  // Simulate agent response
  function simulateAgentResponse() {
    const agentResponses = [
      "Thanks for reaching out! How can I help you with MZLAD Billing System today?",
      "I understand your question. Let me check that for you.",
      "That's a good question! In MZLAD Billing System, you can find that feature in the Settings section.",
      "I'd be happy to help you with that. Could you provide more details about what you're trying to accomplish?",
      "Have you tried updating to the latest version? That often resolves this type of issue.",
      "Let me guide you through this process step by step. First, navigate to the Inventory section.",
      "I'm looking into this issue. In the meantime, could you tell me which version of the application you're using?",
      "Thank you for your patience. I've found a solution to your problem.",
    ];

    const randomResponse =
      agentResponses[Math.floor(Math.random() * agentResponses.length)];

    const messageElement = document.createElement("div");
    messageElement.className = "message agent";

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageElement.innerHTML = `
      <div class="agent-avatar">👨‍💼</div>
      <div class="message-content">
        <div class="agent-name">John (Support Agent)</div>
        <p>${randomResponse}</p>
        <div class="message-time">${timeString}</div>
      </div>
    `;

    chatMessages.appendChild(messageElement);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Handle support form submission
  if (supportForm) {
    supportForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Simulate form submission
      const submitBtn = supportForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      setTimeout(() => {
        // Show success message
        showNotification(
          "Your support ticket has been submitted successfully. We'll get back to you soon!",
          "success"
        );

        // Reset form
        supportForm.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }, 1500);
    });
  }

  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Display notification message
  function showNotification(message, type = "info") {
    // Check if notification container exists, create if not
    let notifContainer = document.querySelector(".notification-container");
    if (!notifContainer) {
      notifContainer = document.createElement("div");
      notifContainer.className = "notification-container";
      document.body.appendChild(notifContainer);
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
      </div>
      <button class="notification-close">×</button>
    `;

    // Add to container
    notifContainer.appendChild(notification);

    // Add event listener to close button
    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        notification.classList.add("closing");
        setTimeout(() => {
          notification.remove();
        }, 300);
      });

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add("closing");
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  // Make help sidebar expandable on mobile
  const helpSidebar = document.querySelector(".help-sidebar");
  if (helpSidebar && window.innerWidth <= 1024) {
    const helpSearch = document.querySelector(".help-search");

    if (helpSearch) {
      helpSearch.addEventListener("click", () => {
        helpSidebar.classList.toggle("expanded");
      });
    }

    // Close sidebar when a nav item is clicked on mobile
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
          helpSidebar.classList.remove("expanded");
        }
      });
    });
  }

  // Handle URL hash on page load
  handleUrlHash();

  // Listen for hash changes
  window.addEventListener("hashchange", handleUrlHash);
});
