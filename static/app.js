
const form = document.getElementById("loanForm");
const submitButton = document.getElementById("submitButton");
const formError = document.getElementById("formError");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");
const resultStatus = document.getElementById("resultStatus");
const resetButton = document.getElementById("resetButton");

// Display error messages
function showError(message) {
    formError.textContent = message;
    formError.classList.add("show");
}

// Clear error messages
function clearError() {
    formError.textContent = "";
    formError.classList.remove("show");
}

// Loading animation
function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.classList.toggle("loading", loading);

    submitButton.querySelector(".button-text").textContent =
        loading
            ? "Analysing application…"
            : "Generate risk assessment";
}

// Format probability into percentage
function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}

// Display prediction result
function renderResult(data) {

    const isHigh = Number(data.default_prediction) === 1;

    const probability = Math.max(
        0,
        Math.min(1, Number(data.default_probability))
    );

    const riskHeading = document.querySelector(".risk-heading");

    // Risk label
    document.getElementById("riskLabel").textContent =
        isHigh ? "HIGH RISK" : "LOW RISK";

    // Risk title
    document.getElementById("riskTitle").textContent =
        isHigh ? "Higher risk profile" : "Lower risk profile";

    // Risk description
    document.getElementById("riskDescription").textContent =
        isHigh
            ? "The model estimates a higher probability of default for this application."
            : "The model estimates a lower probability of default for this application.";

    riskHeading.classList.toggle("high", isHigh);

    // Default probability
    document.getElementById("probabilityValue").textContent =
        formatPercent(probability);

    // Prediction result
    document.getElementById("decisionValue").textContent =
        data.Result || (isHigh ? "High Risk" : "Low Risk");

    // Decision threshold
    document.getElementById("thresholdValue").textContent =
        formatPercent(Number(data.threshold));

    // Update circular gauge
    const gauge = document.getElementById("gaugeValue");

    const arcLength = 298.45;

    gauge.style.strokeDasharray =
        `${(probability * arcLength).toFixed(2)} ${arcLength}`;

    gauge.classList.toggle("high", isHigh);

    // Switch result panels
    emptyState.classList.add("hidden");
    resultContent.classList.remove("hidden");

    // Update status
    resultStatus.classList.add("ready");

    resultStatus.innerHTML =
        "<i></i> ASSESSMENT COMPLETE";

    // Scroll to result
    document.getElementById("resultPanel").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

// Handle form submission
form.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearError();

    if (!form.reportValidity()) return;

    // Collect form data
    const raw = Object.fromEntries(
        new FormData(form).entries()
    );

    // Convert values into correct data types
    const payload = {

        person_age: Number(raw.person_age),

        person_income: Number(raw.person_income),

        person_home_ownership:
            raw.person_home_ownership,

        person_emp_length:
            Number(raw.person_emp_length),

        loan_intent:
            raw.loan_intent,

        loan_grade:
            raw.loan_grade,

        loan_amnt:
            Number(raw.loan_amnt),

        loan_int_rate:
            Number(raw.loan_int_rate),

        loan_percent_income:
            Number(raw.loan_percent_income),

        cb_person_default_on_file:
            raw.cb_person_default_on_file,

        cb_person_cred_hist_length:
            Number(raw.cb_person_cred_hist_length)
    };

    // Additional validation
    if (
        payload.person_age < 18 ||
        payload.person_age > 100
    ) {
        showError(
            "Applicant age must be between 18 and 100."
        );
        return;
    }

    if (
        payload.loan_percent_income < 0 ||
        payload.loan_percent_income > 1
    ) {
        showError(
            "Loan-to-income ratio must be between 0 and 1. Example: 0.25"
        );
        return;
    }

    setLoading(true);

    try {

        // Send data to FastAPI
        const response = await fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        console.log("API Status:", response.status);
        console.log("API Response:", responseText);

        let body;

        try {
            body = JSON.parse(responseText);
        } catch {
            throw new Error(
                `Server returned an invalid response. HTTP ${response.status}: ${responseText.slice(0, 300)}`
            );
        }

        if (!response.ok) {
            throw new Error(
                body.detail || `API Error: HTTP ${response.status}`
            );
        }

        renderResult(body);


    } catch (error) {

        showError(
            `${error.message || "Something went wrong."} Check that the API and model files are available, then try again.`
        );

    } finally {

        setLoading(false);

    }

});

// Reset result panel
resetButton.addEventListener("click", () => {

    resultContent.classList.add("hidden");

    emptyState.classList.remove("hidden");

    resultStatus.classList.remove("ready");

    resultStatus.innerHTML =
        "<i></i> AWAITING INPUT";

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

});
