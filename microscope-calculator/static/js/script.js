/**
 * Microscope Measurement Calculator
 * Main JavaScript functionality
 */

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const elements = {
    // Form elements
    calculatorForm: document.getElementById("calculator-form"),
    usernameInput: document.getElementById("username"),
    microscopeSizeInput: document.getElementById("microscope-size"),
    magnificationInput: document.getElementById("magnification"),
    calculateBtn: document.getElementById("calculate-btn"),
    saveBtn: document.getElementById("save-btn"),
    clearBtn: document.getElementById("clear-btn"),

    // Result elements
    resultContainer: document.getElementById("result-container"),
    realSizeSpan: document.getElementById("real-size"),
    errorAlert: document.getElementById("error-alert"),

    // Records tab elements
    refreshBtn: document.getElementById("refresh-btn"),
    recordsLoading: document.getElementById("records-loading"),
    noRecords: document.getElementById("no-records"),
    recordsTableContainer: document.getElementById("records-table-container"),
    recordsTableBody: document.getElementById("records-table-body"),
    recordsTab: document.getElementById("records-tab"),
  };

  // Current calculation result
  let currentResult = null;

  /**
   * Calculate the real-life size based on form inputs
   */
  async function calculateRealSize() {
    // Hide any previous errors
    hideError();

    // Validate inputs
    if (
      !elements.microscopeSizeInput.value ||
      !elements.magnificationInput.value
    ) {
      showError("Please enter both microscope size and magnification");
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append("microscope_size", elements.microscopeSizeInput.value);
    formData.append("magnification", elements.magnificationInput.value);

    try {
      // Send calculation request
      const response = await fetch("/calculate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || "Calculation failed");
        return;
      }

      // Display result
      currentResult = data;
      elements.realSizeSpan.textContent = data.real_size.toFixed(6);
      elements.resultContainer.classList.remove("d-none");
      elements.saveBtn.disabled = false;
    } catch (error) {
      showError("An error occurred during calculation");
      console.error("Calculation error:", error);
    }
  }

  /**
   * Save the current measurement to the database
   */
  async function saveMeasurement() {
    if (!currentResult) return;

    // Validate username
    if (!elements.usernameInput.value.trim()) {
      showError("Please enter a username");
      return;
    }

    try {
      // Prepare data for saving
      const saveData = {
        username: elements.usernameInput.value.trim(),
        microscope_size: currentResult.microscope_size,
        magnification: currentResult.magnification,
        real_size: currentResult.real_size,
      };

      // Send save request
      const response = await fetch("/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saveData),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || "Failed to save measurement");
        return;
      }

      // Show success message
      alert("Measurement saved successfully!");

      // Clear form
      clearForm();

      // Reload measurements if we're on the records tab
      if (document.querySelector("#records-tab").classList.contains("active")) {
        loadMeasurements();
      }
    } catch (error) {
      showError("An error occurred while saving");
      console.error("Save error:", error);
    }
  }

  /**
   * Clear the calculator form and results
   */
  function clearForm() {
    elements.calculatorForm.reset();
    elements.resultContainer.classList.add("d-none");
    elements.saveBtn.disabled = true;
    hideError();
    currentResult = null;
  }

  /**
   * Load measurements from the server
   */
  async function loadMeasurements() {
    try {
      // Show loading indicator
      elements.recordsLoading.classList.remove("d-none");
      elements.noRecords.classList.add("d-none");
      elements.recordsTableContainer.classList.add("d-none");

      // Fetch measurements
      const response = await fetch("/measurements");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load measurements");
      }

      // Update UI based on data
      if (data.length === 0) {
        elements.noRecords.classList.remove("d-none");
      } else {
        // Clear existing table rows
        elements.recordsTableBody.innerHTML = "";

        // Add new rows for each measurement
        data.forEach((record) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                        <td>${record.id}</td>
                        <td>${escapeHtml(record.username)}</td>
                        <td>${record.microscope_size.toFixed(4)}</td>
                        <td>${record.magnification.toFixed(2)}</td>
                        <td>${record.real_size.toFixed(6)}</td>
                        <td>${record.timestamp}</td>
                    `;
          elements.recordsTableBody.appendChild(row);
        });

        elements.recordsTableContainer.classList.remove("d-none");
      }
    } catch (error) {
      console.error("Error loading measurements:", error);
      alert("Failed to load measurements: " + error.message);
    } finally {
      // Hide loading indicator
      elements.recordsLoading.classList.add("d-none");
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    elements.errorAlert.textContent = message;
    elements.errorAlert.classList.remove("d-none");
  }

  /**
   * Hide error message
   */
  function hideError() {
    elements.errorAlert.classList.add("d-none");
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Event Listeners
  elements.calculateBtn.addEventListener("click", calculateRealSize);
  elements.saveBtn.addEventListener("click", saveMeasurement);
  elements.clearBtn.addEventListener("click", clearForm);
  elements.refreshBtn.addEventListener("click", loadMeasurements);
  elements.recordsTab.addEventListener("click", loadMeasurements);

  // Initial load of measurements
  loadMeasurements();
});
