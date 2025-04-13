/**
 * Compact Mode Controller
 * Makes the entire billing interface visible without scrolling
 */
document.addEventListener("DOMContentLoaded", function () {
  // Create compact mode toggle button
  const compactModeButton = document.createElement("button");
  compactModeButton.id = "compact-mode-toggle";
  compactModeButton.textContent = "Compact View";
  compactModeButton.title = "Toggle compact mode to fit everything on screen";
  document.body.appendChild(compactModeButton);

  // Create scale controls
  const scaleControl = document.createElement("div");
  scaleControl.className = "scale-control";
  scaleControl.innerHTML = `
    <button id="scale-down">-</button>
    <span class="scale-value">100%</span>
    <button id="scale-up">+</button>
  `;
  document.body.appendChild(scaleControl);

  // Get scale elements
  const scaleValue = scaleControl.querySelector(".scale-value");
  const scaleUpBtn = document.getElementById("scale-up");
  const scaleDownBtn = document.getElementById("scale-down");

  // Set initial scale and keep track of current scale
  let currentScale = 100;
  const scaleSteps = [100, 90, 80, 70, 60, 50];

  // Function to apply scale
  function applyScale(scale) {
    // Remove all scale classes
    document.body.classList.remove(
      "scale-90",
      "scale-80",
      "scale-70",
      "scale-60",
      "scale-50"
    );

    // If scale is not 100%, add the appropriate class
    if (scale < 100) {
      document.body.classList.add(`scale-${scale}`);
    }

    // Update scale value display
    scaleValue.textContent = `${scale}%`;

    // Set CSS variable for additional scaling calculations
    document.documentElement.style.setProperty("--scale-factor", 100 / scale);

    // Save preference to localStorage
    localStorage.setItem("billingScale", scale);
  }

  // Toggle compact mode
  compactModeButton.addEventListener("click", function () {
    document.body.classList.toggle("compact-mode");
    const isCompact = document.body.classList.contains("compact-mode");

    // Show/hide scale controls
    scaleControl.style.display = isCompact ? "flex" : "none";

    // Update button text
    compactModeButton.textContent = isCompact ? "Normal View" : "Compact View";

    // Apply appropriate scale
    if (isCompact) {
      applyScale(currentScale);
    } else {
      applyScale(100);
    }

    // Save preference to localStorage
    localStorage.setItem("billingCompactMode", isCompact ? "true" : "false");
  });

  // Scale up button
  scaleUpBtn.addEventListener("click", function () {
    const currentIndex = scaleSteps.indexOf(currentScale);
    if (currentIndex > 0) {
      currentScale = scaleSteps[currentIndex - 1];
      applyScale(currentScale);
    }
  });

  // Scale down button
  scaleDownBtn.addEventListener("click", function () {
    const currentIndex = scaleSteps.indexOf(currentScale);
    if (currentIndex < scaleSteps.length - 1) {
      currentScale = scaleSteps[currentIndex + 1];
      applyScale(currentScale);
    }
  });

  // Load saved preferences
  window.addEventListener("load", function () {
    const savedCompactMode = localStorage.getItem("billingCompactMode");
    const savedScale = localStorage.getItem("billingScale");

    if (savedCompactMode === "true") {
      document.body.classList.add("compact-mode");
      compactModeButton.textContent = "Normal View";
      scaleControl.style.display = "flex";
    }

    if (savedScale) {
      currentScale = parseInt(savedScale);
      if (document.body.classList.contains("compact-mode")) {
        applyScale(currentScale);
      }
    }
  });

  // Apply initial best fit scale based on screen size (optional automatic adjustment)
  function applyBestFitScale() {
    const viewportHeight = window.innerHeight;
    const contentHeight =
      document.querySelector(".billing-container")?.scrollHeight || 800;

    // Choose scale based on how much content needs to fit
    let bestScale = 100;

    if (contentHeight > viewportHeight) {
      const ratio = viewportHeight / contentHeight;

      // Find the best matching scale
      if (ratio < 0.55) bestScale = 50;
      else if (ratio < 0.65) bestScale = 60;
      else if (ratio < 0.75) bestScale = 70;
      else if (ratio < 0.85) bestScale = 80;
      else if (ratio < 0.95) bestScale = 90;

      // If content doesn't fit well, automatically enable compact mode
      if (
        bestScale < 100 &&
        !document.body.classList.contains("compact-mode")
      ) {
        // Only auto-apply if user hasn't explicitly set a preference
        if (!localStorage.getItem("billingCompactMode")) {
          document.body.classList.add("compact-mode");
          compactModeButton.textContent = "Normal View";
          scaleControl.style.display = "flex";
          currentScale = bestScale;
          applyScale(bestScale);
        }
      }
    }
  }

  // Apply best fit on first load after a short delay to ensure content is rendered
  setTimeout(applyBestFitScale, 500);
});
